"""API endpoints for user favorites management."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from axiestudio.logging import logger
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from axiestudio.api.utils import get_current_active_user
from axiestudio.services.database.models.user.model import User
from axiestudio.services.database.models.user_favorite.crud import (
    create_user_favorite,
    delete_user_favorite,
    get_user_favorite_item_ids,
    get_user_favorites,
    toggle_user_favorite,
)
from axiestudio.services.database.models.user_favorite.model import (
    UserFavoriteCreate,
    UserFavoriteRead,
)
from axiestudio.services.deps import get_session

router = APIRouter(prefix="/favorites", tags=["favorites"])


class FavoriteToggleRequest(BaseModel):
    """Request model for toggling favorites."""
    item_id: str
    item_type: str  # "FLOW" or "COMPONENT"
    item_name: str
    item_description: str | None = None
    item_author: str | None = None


class FavoriteToggleResponse(BaseModel):
    """Response model for toggle operations."""
    is_favorited: bool
    message: str
    favorite_id: UUID | None = None


@router.get("/", response_model=List[UserFavoriteRead])
async def get_user_favorites_endpoint(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[UserFavoriteRead]:
    """Get all favorites for the current user."""
    try:
        favorites = await get_user_favorites(session, current_user.id)
        return [UserFavoriteRead.model_validate(fav.model_dump()) for fav in favorites]
    except Exception as e:
        logger.error(f"Failed to get user favorites: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve favorites"
        ) from e


@router.get("/item-ids", response_model=List[str])
async def get_user_favorite_item_ids_endpoint(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """Get list of favorite item IDs for quick lookup."""
    try:
        item_ids = await get_user_favorite_item_ids(session, current_user.id)
        return item_ids
    except Exception as e:
        logger.error(f"Failed to get favorite item IDs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve favorite item IDs"
        ) from e


@router.post("/toggle", response_model=FavoriteToggleResponse)
async def toggle_favorite_endpoint(
    request: FavoriteToggleRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> FavoriteToggleResponse:
    """Toggle a favorite item for the current user."""
    try:
        is_favorited, favorite = await toggle_user_favorite(
            session=session,
            user_id=current_user.id,
            item_id=request.item_id,
            item_type=request.item_type,
            item_name=request.item_name,
            item_description=request.item_description,
            item_author=request.item_author,
        )
        
        message = "Added to favorites" if is_favorited else "Removed from favorites"
        favorite_id = favorite.id if favorite else None
        
        return FavoriteToggleResponse(
            is_favorited=is_favorited,
            message=message,
            favorite_id=favorite_id
        )
        
    except Exception as e:
        logger.error(f"Failed to toggle favorite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle favorite"
        ) from e


@router.post("/", response_model=UserFavoriteRead)
async def create_favorite_endpoint(
    favorite_data: UserFavoriteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> UserFavoriteRead:
    """Create a new favorite."""
    try:
        favorite = await create_user_favorite(session, current_user.id, favorite_data)
        return UserFavoriteRead.model_validate(favorite.model_dump())
    except Exception as e:
        logger.error(f"Failed to create favorite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create favorite"
        ) from e


@router.delete("/{item_id}")
async def delete_favorite_endpoint(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Delete a favorite by item ID."""
    try:
        success = await delete_user_favorite(session, current_user.id, item_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Favorite not found"
            )
        return {"message": "Favorite deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete favorite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete favorite"
        ) from e
