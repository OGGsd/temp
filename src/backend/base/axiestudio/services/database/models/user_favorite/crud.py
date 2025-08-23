"""CRUD operations for user favorites."""

from typing import List, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from axiestudio.services.database.models.user_favorite.model import (
    UserFavorite,
    UserFavoriteCreate,
    UserFavoriteRead,
)


async def create_user_favorite(
    session: AsyncSession, 
    user_id: UUID, 
    favorite_data: UserFavoriteCreate
) -> UserFavorite:
    """Create a new user favorite."""
    try:
        # Check if favorite already exists
        existing = await get_user_favorite_by_item(session, user_id, favorite_data.item_id)
        if existing:
            logger.info(f"Favorite already exists for user {user_id}, item {favorite_data.item_id}")
            return existing
        
        # Create new favorite
        favorite_data.user_id = user_id
        db_favorite = UserFavorite.model_validate(favorite_data.model_dump())
        session.add(db_favorite)
        await session.commit()
        await session.refresh(db_favorite)
        
        logger.info(f"Created favorite for user {user_id}, item {favorite_data.item_id}")
        return db_favorite
        
    except Exception as e:
        logger.error(f"Failed to create favorite: {e}")
        await session.rollback()
        raise


async def get_user_favorites(session: AsyncSession, user_id: UUID) -> List[UserFavorite]:
    """Get all favorites for a user."""
    try:
        statement = select(UserFavorite).where(UserFavorite.user_id == user_id)
        result = await session.exec(statement)
        favorites = result.all()
        
        logger.debug(f"Retrieved {len(favorites)} favorites for user {user_id}")
        return list(favorites)
        
    except Exception as e:
        logger.error(f"Failed to get user favorites: {e}")
        return []


async def get_user_favorite_by_item(
    session: AsyncSession, 
    user_id: UUID, 
    item_id: str
) -> Optional[UserFavorite]:
    """Get a specific favorite by user and item ID."""
    try:
        statement = select(UserFavorite).where(
            UserFavorite.user_id == user_id,
            UserFavorite.item_id == item_id
        )
        result = await session.exec(statement)
        favorite = result.first()
        
        return favorite
        
    except Exception as e:
        logger.error(f"Failed to get favorite by item: {e}")
        return None


async def delete_user_favorite(
    session: AsyncSession, 
    user_id: UUID, 
    item_id: str
) -> bool:
    """Delete a user favorite."""
    try:
        favorite = await get_user_favorite_by_item(session, user_id, item_id)
        if not favorite:
            logger.warning(f"Favorite not found for user {user_id}, item {item_id}")
            return False
        
        await session.delete(favorite)
        await session.commit()
        
        logger.info(f"Deleted favorite for user {user_id}, item {item_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete favorite: {e}")
        await session.rollback()
        return False


async def get_user_favorite_item_ids(session: AsyncSession, user_id: UUID) -> List[str]:
    """Get list of favorite item IDs for a user (for quick lookup)."""
    try:
        statement = select(UserFavorite.item_id).where(UserFavorite.user_id == user_id)
        result = await session.exec(statement)
        item_ids = result.all()
        
        return list(item_ids)
        
    except Exception as e:
        logger.error(f"Failed to get favorite item IDs: {e}")
        return []


async def toggle_user_favorite(
    session: AsyncSession,
    user_id: UUID,
    item_id: str,
    item_type: str,
    item_name: str,
    item_description: str | None = None,
    item_author: str | None = None,
) -> tuple[bool, UserFavorite | None]:
    """
    Toggle a user favorite. Returns (is_favorited, favorite_object).
    
    Returns:
        tuple: (True, favorite) if added, (False, None) if removed
    """
    try:
        existing = await get_user_favorite_by_item(session, user_id, item_id)
        
        if existing:
            # Remove favorite
            await session.delete(existing)
            await session.commit()
            logger.info(f"Removed favorite for user {user_id}, item {item_id}")
            return False, None
        else:
            # Add favorite
            favorite_data = UserFavoriteCreate(
                item_id=item_id,
                item_type=item_type,
                item_name=item_name,
                item_description=item_description,
                item_author=item_author,
                user_id=user_id
            )
            favorite = await create_user_favorite(session, user_id, favorite_data)
            logger.info(f"Added favorite for user {user_id}, item {item_id}")
            return True, favorite
            
    except Exception as e:
        logger.error(f"Failed to toggle favorite: {e}")
        await session.rollback()
        raise
