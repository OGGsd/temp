from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from axiestudio.api.utils import DbSession
from axiestudio.services.database.models.user.model import User
from axiestudio.services.email.service import EmailService


def ensure_timezone_aware(dt: datetime | None) -> datetime | None:
    """
    Ensure a datetime is timezone-aware.

    This fixes the common issue where database datetimes are stored as naive
    but need to be compared with timezone-aware datetimes.
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        # Assume naive datetimes are in UTC (database default)
        return dt.replace(tzinfo=timezone.utc)

    return dt


router = APIRouter(prefix="/email", tags=["Email Verification"])


class ResendEmailRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyCodeRequest(BaseModel):
    """Request model for 6-digit code verification"""
    email: str
    code: str


class ResendCodeRequest(BaseModel):
    """Request model for resending 6-digit code"""
    email: str


class ChangePasswordRequest(BaseModel):
    """Request model for changing password with verification code"""
    email: str
    code: str
    new_password: str


@router.get("/verify")
async def verify_email(
    session: DbSession,
    token: str = Query(..., description="Email verification token"),
):
    """
    EMAIL VERIFICATION ENDPOINT
    This is called when user clicks "Confirm Email" button in their email.
    It MUST activate the user account automatically.
    """
    from loguru import logger

    if not token:
        logger.warning("Email verification attempted without token")
        raise HTTPException(status_code=400, detail="Verification token is required")

    logger.info(f"Email verification attempt with token: {token[:8]}...")

    # Find user by verification token
    stmt = select(User).where(User.email_verification_token == token)
    user = (await session.exec(stmt)).first()

    if not user:
        logger.warning(f"Invalid verification token: {token[:8]}...")
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token. If you already verified your email, please try logging in directly."
        )

    logger.info(f"Found user for verification: {user.username} (email: {user.email})")

    # Check if token has expired (with timezone-safe comparison)
    if user.email_verification_expires:
        user_expires = ensure_timezone_aware(user.email_verification_expires)
        current_time = datetime.now(timezone.utc)
        
        if current_time > user_expires:
            logger.warning(f"Expired verification token for {user.username}")
            raise HTTPException(
                status_code=400,
                detail="Verification token has expired. Please request a new verification email."
            )

    # Log current state BEFORE verification
    logger.info(f"BEFORE verification - User: {user.username}, is_active: {user.is_active}, email_verified: {user.email_verified}")

    try:
        # CRITICAL: This is what happens when user clicks "Confirm Email"
        logger.info(f"ACTIVATING USER: {user.username}")

        # Step 1: Mark email as verified
        user.email_verified = True
        logger.info(f"Set email_verified = True for {user.username}")

        # Step 2: ACTIVATE THE ACCOUNT - THIS IS THE KEY!
        user.is_active = True
        logger.info(f"Set is_active = True for {user.username}")

        # Step 3: Clear verification tokens
        user.email_verification_token = None
        user.email_verification_expires = None
        logger.info(f"Cleared verification tokens for {user.username}")

        # Step 4: Update timestamp
        user.updated_at = datetime.now(timezone.utc)

        # Step 5: Reset any failed login attempts
        if hasattr(user, 'failed_login_attempts'):
            user.failed_login_attempts = 0
        if hasattr(user, 'locked_until'):
            user.locked_until = None

        # Step 6: COMMIT TO DATABASE - CRITICAL!
        logger.info(f"COMMITTING changes to database for {user.username}")
        await session.commit()
        await session.refresh(user)

        # Log final state AFTER verification
        logger.info(f"AFTER verification - User: {user.username}, is_active: {user.is_active}, email_verified: {user.email_verified}")
        logger.info(f"USER {user.username} SUCCESSFULLY VERIFIED AND ACTIVATED!")

    except Exception as e:
        logger.error(f"FAILED to verify user {user.username}: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during verification: {str(e)}")

    # Generate access token for automatic login
    try:
        from axiestudio.services.auth.utils import create_user_tokens
        tokens = await create_user_tokens(user.id, session, update_last_login=True)
        logger.info(f"Generated access tokens for {user.username}")

        return {
            "message": "Email verified successfully! Your account is now active and you are logged in.",
            "verified": True,
            "activated": True,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer",
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "auto_login": True,
            "can_login": True
        }

    except Exception as e:
        logger.error(f"Failed to generate tokens for {user.username}: {e}")
        # Still return success for verification, just without auto-login
        return {
            "message": "Email verified successfully! Your account is now active. Please log in.",
            "verified": True,
            "activated": True,
            "auto_login": False,
            "can_login": True
        }


@router.post("/resend")
async def resend_verification_email(
    request: ResendEmailRequest,
    session: DbSession,
):
    """Resend verification email to user."""
    # Find user by email
    stmt = select(User).where(User.email == request.email)
    user = (await session.exec(stmt)).first()

    if not user:
        # ENTERPRISE SECURITY: Prevent email enumeration
        # Always return success to prevent revealing if email exists
        from loguru import logger
        logger.warning(f"Forgot password attempted for non-existent email: {request.email}")
        return {
            "message": "If this email exists in our system, you will receive a password reset link.",
            "success": True
        }

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    # Generate new verification token
    email_service = EmailService()
    token = email_service.generate_verification_token()
    expiry = email_service.get_verification_expiry()

    # Update user with new token
    user.email_verification_token = token
    user.email_verification_expires = expiry
    user.updated_at = datetime.now(timezone.utc)

    await session.commit()

    # Send verification email
    email_sent = await email_service.send_verification_email(user.email, user.username, token)

    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")

    return {
        "message": "Verification email sent successfully",
        "email": user.email
    }


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    session: DbSession,
):
    """Send 6-digit password reset code with enterprise security features."""
    from loguru import logger

    # Find user by email
    stmt = select(User).where(User.email == request.email)
    user = (await session.exec(stmt)).first()

    # Always return success to prevent email enumeration attacks
    success_response = {
        "message": "If an account with that email exists, a 6-digit verification code has been sent.",
        "email": request.email,
        "security_notice": "For security reasons, we don't confirm whether this email exists in our system."
    }

    if not user:
        # ENTERPRISE SECURITY: Prevent email enumeration
        logger.warning(f"Forgot password attempted for non-existent email: {request.email}")
        return success_response

    # Generate 6-digit password reset code
    from axiestudio.services.auth.verification_code import generate_code
    reset_code = generate_code()
    reset_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minutes

    # Store reset code and security metadata
    user.verification_code = reset_code
    user.verification_code_expires = reset_expiry
    user.updated_at = datetime.now(timezone.utc)

    # Log successful reset request for security audit
    logger.info(f"Password reset code requested for user: {user.username}")

    await session.commit()

    # Send password reset code email
    email_service = EmailService()
    email_sent = await email_service.send_password_reset_code_email(
        user.email,
        user.username,
        reset_code
    )

    if not email_sent:
        logger.error(f"Failed to send password reset email to {user.email}")

    return success_response


@router.post("/verify-password-reset-code")
async def verify_password_reset_code(
    request: VerifyCodeRequest,
    session: DbSession,
):
    """Verify 6-digit password reset code."""
    # Find user by email
    stmt = select(User).where(User.email == request.email)
    user = (await session.exec(stmt)).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or verification code")
    
    # Check if code exists and hasn't expired
    if not user.verification_code or not user.verification_code_expires:
        raise HTTPException(status_code=400, detail="No password reset code found. Please request a new one.")
    
    # Check if code has expired
    if datetime.now(timezone.utc) > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Password reset code has expired. Please request a new one.")
    
    # Verify the code
    if user.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Code is valid - return success (don't clear code yet, wait for password change)
    return {
        "verified": True,
        "message": "Password reset code verified successfully. You can now set a new password.",
        "email": request.email
    }


@router.post("/change-password-with-code")
async def change_password_with_code(
    request: ChangePasswordRequest,
    session: DbSession,
):
    """Change password using verified reset code."""
    # Find user by email
    stmt = select(User).where(User.email == request.email)
    user = (await session.exec(stmt)).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or verification code")
    
    # Verify code again for security
    if not user.verification_code or user.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code has expired
    if datetime.now(timezone.utc) > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Password reset code has expired. Please request a new one.")
    
    # Update password
    from axiestudio.services.auth.utils import get_password_hash
    user.password = get_password_hash(request.new_password)
    user.updated_at = datetime.now(timezone.utc)
    
    # Clear verification code after successful password change
    user.verification_code = None
    user.verification_code_expires = None
    
    await session.commit()
    
    return {
        "success": True,
        "message": "Password changed successfully. You can now log in with your new password."
    }
