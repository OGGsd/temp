from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.sql.expression import SelectOfScalar

from axiestudio.api.utils import CurrentActiveUser, DbSession
from axiestudio.api.v1.schemas import UsersResponse
from axiestudio.initial_setup.setup import get_or_create_default_folder
from axiestudio.services.auth.utils import (
    get_current_active_superuser,
    get_password_hash,
    verify_password,
)
from axiestudio.services.database.models.user.crud import get_user_by_id, update_user
from axiestudio.services.database.models.user.model import User, UserCreate, UserRead, UserUpdate
from axiestudio.services.deps import get_settings_service
from axiestudio.services.email.service import email_service
from axiestudio.services.trial.abuse_prevention import trial_abuse_prevention

router = APIRouter(tags=["Users"], prefix="/users")


async def _create_regular_user(user: UserCreate, request: Request, session: DbSession) -> User:
    """Create a regular user with trial and abuse prevention."""
    from datetime import datetime, timezone, timedelta

    # Extract client information for abuse prevention
    signup_ip = trial_abuse_prevention.extract_client_ip(request)
    device_fingerprint = trial_abuse_prevention.generate_device_fingerprint(request)

    # Basic rate limiting for signup endpoint (prevent rapid-fire signups)
    from axiestudio.api.v1.subscriptions import check_rate_limit
    if not check_rate_limit(f"signup_{signup_ip}", "signup"):
        raise HTTPException(
            status_code=429,
            detail="Too many signup attempts from this location. Please wait before trying again."
        )

    # Check for trial abuse before creating user
    abuse_check = await trial_abuse_prevention.check_trial_abuse(
        session, user.email, signup_ip, device_fingerprint
    )

    # Block signup if high risk
    if abuse_check["action"] == "block":
        await trial_abuse_prevention.log_signup_attempt(
            session, user.email, signup_ip, device_fingerprint, False, abuse_check["risk_score"]
        )
        raise HTTPException(
            status_code=429,
            detail="Account creation temporarily restricted. Please contact support if you believe this is an error."
        )

    new_user = User.model_validate(user, from_attributes=True)
    new_user.password = get_password_hash(user.password)

    # Email verification flow: Users are ALWAYS INACTIVE until they verify their email
    # This ensures consistent behavior regardless of environment settings
    new_user.is_active = False  # Always start inactive, become active after email verification

    # Generate email verification token
    verification_token = email_service.generate_verification_token()
    verification_expiry = email_service.get_verification_expiry()

    new_user.email_verification_token = verification_token
    new_user.email_verification_expires = verification_expiry
    new_user.email_verified = False

    # Set trial information for regular users
    now = datetime.now(timezone.utc)
    new_user.trial_start = now
    new_user.trial_end = now + timedelta(days=7)
    new_user.subscription_status = "trial"

    # Set abuse prevention fields
    new_user.signup_ip = signup_ip
    new_user.device_fingerprint = device_fingerprint

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Send verification email
    email_sent = await email_service.send_verification_email(
        new_user.email, new_user.username, verification_token
    )

    if not email_sent:
        # Log warning but don't fail the signup
        from loguru import logger
        logger.warning(f"Failed to send verification email to {new_user.email}")

    # Log successful signup
    await trial_abuse_prevention.log_signup_attempt(
        session, user.email, signup_ip, device_fingerprint, True, abuse_check["risk_score"]
    )

    return new_user


async def _create_admin_user(user: UserCreate, session: DbSession) -> User:
    """Create a user via admin panel - no trial or abuse prevention."""
    new_user = User.model_validate(user, from_attributes=True)
    new_user.password = get_password_hash(user.password)

    # Respect the admin's choice for is_active and is_superuser
    # Don't override these - let the admin panel control them
    # new_user.is_active and new_user.is_superuser are already set from user input

    # Admin-created users don't get trial fields - they're managed manually
    # No trial_start, trial_end, subscription_status set
    # No signup_ip, device_fingerprint set

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    return new_user





@router.post("/", response_model=UserRead, status_code=201)
async def add_user(
    user: UserCreate,
    request: Request,
    session: DbSession,
) -> User:
    """Add a new user to the database."""
    try:
        # For now, treat all user creation as regular signup
        # Admin detection will be handled via a separate admin endpoint if needed
        new_user = await _create_regular_user(user, request, session)

        # Create default folder for all users
        folder = await get_or_create_default_folder(session, new_user.id)
        if not folder:
            raise HTTPException(status_code=500, detail="Error creating default project")

    except IntegrityError as e:
        await session.rollback()
        # Check if it's email uniqueness violation
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        if "email" in error_msg.lower():
            raise HTTPException(status_code=400, detail="This email address is already registered.") from e
        else:
            raise HTTPException(status_code=400, detail="This username is unavailable.") from e

    return new_user


@router.get("/whoami", response_model=UserRead)
async def read_current_user(
    current_user: CurrentActiveUser,
) -> User:
    """Retrieve the current user's data."""
    return current_user


@router.get("/", dependencies=[Depends(get_current_active_superuser)])
async def read_all_users(
    *,
    skip: int = 0,
    limit: int = 10,
    session: DbSession,
) -> UsersResponse:
    """Retrieve a list of users from the database with pagination."""
    query: SelectOfScalar = select(User).offset(skip).limit(limit)
    users = (await session.exec(query)).fetchall()

    count_query = select(func.count()).select_from(User)
    total_count = (await session.exec(count_query)).first()

    return UsersResponse(
        total_count=total_count,
        users=[UserRead(**user.model_dump()) for user in users],
    )


@router.patch("/{user_id}", response_model=UserRead)
async def patch_user(
    user_id: UUID,
    user_update: UserUpdate,
    user: CurrentActiveUser,
    session: DbSession,
) -> User:
    """Update an existing user's data."""
    update_password = bool(user_update.password)

    if not user.is_superuser and user_update.is_superuser:
        raise HTTPException(status_code=403, detail="Permission denied")

    if not user.is_superuser and user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    if update_password:
        if not user.is_superuser:
            raise HTTPException(status_code=400, detail="You can't change your password here")
        user_update.password = get_password_hash(user_update.password)

    if user_db := await get_user_by_id(session, user_id):
        if not update_password:
            user_update.password = user_db.password
        return await update_user(session, user_db.id, user_update)
    raise HTTPException(status_code=404, detail="User not found")


@router.patch("/{user_id}/reset-password", response_model=UserRead)
async def reset_password(
    user_id: UUID,
    user_update: UserUpdate,
    user: CurrentActiveUser,
    session: DbSession,
) -> User:
    """Reset a user's password."""
    if user_id != user.id:
        raise HTTPException(status_code=400, detail="You can't change another user's password")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if verify_password(user_update.password, user.password):
        raise HTTPException(status_code=400, detail="You can't use your current password")
    new_password = get_password_hash(user_update.password)
    user.password = new_password
    await session.commit()
    await session.refresh(user)

    return user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
async def delete_user(
    user_id: UUID,
    session: DbSession,
) -> dict:
    """Delete a user from the database."""
    # Note: Superuser check is handled by dependencies=[Depends(get_current_active_superuser)]
    # We can't check for self-deletion without current_user, but superuser dependency ensures proper access

    stmt = select(User).where(User.id == user_id)
    user_db = (await session.exec(stmt)).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")

    await session.delete(user_db)
    await session.commit()

    return {"detail": "User deleted"}
