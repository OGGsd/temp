from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from axiestudio.services.database.models.user.model import User


class UserFavoriteBase(SQLModel):
    """Base model for user favorites in the showcase."""
    item_id: str = Field(index=True, description="ID of the favorited showcase item")
    item_type: str = Field(description="Type of item: 'FLOW' or 'COMPONENT'")
    item_name: str = Field(description="Name of the favorited item")
    item_description: str | None = Field(default=None, description="Description of the favorited item")
    item_author: str | None = Field(default=None, description="Author of the favorited item")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserFavorite(UserFavoriteBase, table=True):  # type: ignore[call-arg]
    """Database model for user favorites."""
    id: UUID = Field(default_factory=uuid4, primary_key=True, unique=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)

    # Relationship to user
    user: "User" = Relationship(back_populates="favorites")

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class UserFavoriteCreate(UserFavoriteBase):
    """Model for creating a new favorite."""
    user_id: UUID


class UserFavoriteRead(UserFavoriteBase):
    """Model for reading favorites."""
    id: UUID
    user_id: UUID
    created_at: datetime


class UserFavoriteUpdate(SQLModel):
    """Model for updating favorites (minimal - mostly for metadata updates)."""
    item_name: str | None = None
    item_description: str | None = None
    item_author: str | None = None
