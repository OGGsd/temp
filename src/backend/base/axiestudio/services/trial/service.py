"""Trial management service for handling user trials and cleanup."""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import List

from axiestudio.logging import logger
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from axiestudio.services.database.models.user.model import User
from axiestudio.services.database.models.user.crud import get_user_by_id
try:
    from axiestudio.services.deps import get_db_service
except ImportError:
    # Fallback for when deps are not available
    get_db_service = None


class TrialService:
    """Service for managing user trials and cleanup."""
    
    def __init__(self):
        self.trial_duration_days = 7
    
    async def check_trial_status(self, user: User) -> dict:
        """Check if user's trial is active, expired, or if they have a subscription."""
        now = datetime.now(timezone.utc)
        
        # If user has active subscription, they're good
        if user.subscription_status == "active":
            return {
                "status": "subscribed",
                "trial_expired": False,
                "days_left": 0,
                "should_cleanup": False
            }
        
        # Calculate trial end date with timezone consistency
        trial_start = user.trial_start or user.create_at
        trial_end = user.trial_end or (trial_start + timedelta(days=self.trial_duration_days))

        # Ensure timezone consistency for comparisons
        if trial_start and trial_start.tzinfo is None:
            trial_start = trial_start.replace(tzinfo=timezone.utc)
        if trial_end and trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)

        # Check if trial has expired
        trial_expired = now > trial_end if trial_end else False
        days_left = max(0, (trial_end - now).days) if trial_end else 0
        
        # Should cleanup if trial expired and no subscription
        should_cleanup = trial_expired and user.subscription_status != "active"
        
        return {
            "status": "trial" if not trial_expired else "expired",
            "trial_expired": trial_expired,
            "days_left": days_left,
            "should_cleanup": should_cleanup,
            "trial_end": trial_end
        }
    
    async def get_expired_trial_users(self, session: AsyncSession) -> List[User]:
        """Get all users whose trials have expired and don't have active subscriptions."""
        now = datetime.now(timezone.utc)
        cutoff_date = now - timedelta(days=self.trial_duration_days)
        
        # Find users whose trial has expired
        stmt = select(User).where(
            User.create_at < cutoff_date,
            User.subscription_status != "active",
            User.is_superuser == False  # Don't cleanup superusers
        )
        
        result = await session.exec(stmt)
        expired_users = result.all()
        
        # Filter users whose trial has actually expired
        truly_expired = []
        for user in expired_users:
            trial_status = await self.check_trial_status(user)
            if trial_status["should_cleanup"]:
                truly_expired.append(user)
        
        return truly_expired
    
    async def cleanup_expired_user(self, user: User, session: AsyncSession) -> bool:
        """Cleanup an expired user account."""
        try:
            logger.info(f"Cleaning up expired user: {user.username} (ID: {user.id})")
            
            # Instead of deleting, we'll deactivate the user
            # This preserves data integrity while preventing access
            user.is_active = False
            user.subscription_status = "expired"
            
            await session.commit()
            logger.info(f"Successfully deactivated expired user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cleanup user {user.username}: {e}")
            await session.rollback()
            return False
    
    async def cleanup_expired_trials(self) -> int:
        """Cleanup all expired trial users. Returns number of users cleaned up."""
        cleanup_count = 0
        
        try:
            db_service = get_db_service()
            async with db_service.with_session() as session:
                expired_users = await self.get_expired_trial_users(session)
                
                logger.info(f"Found {len(expired_users)} expired trial users to cleanup")
                
                for user in expired_users:
                    success = await self.cleanup_expired_user(user, session)
                    if success:
                        cleanup_count += 1
                
                logger.info(f"Successfully cleaned up {cleanup_count} expired trial users")
                
        except Exception as e:
            logger.error(f"Error during trial cleanup: {e}")
        
        return cleanup_count
    
    async def extend_trial(self, user_id: str, additional_days: int, session: AsyncSession) -> bool:
        """Extend a user's trial by additional days."""
        try:
            user = await get_user_by_id(session, user_id)
            if not user:
                return False
            
            # Calculate new trial end date with timezone consistency
            current_trial_end = user.trial_end or (user.trial_start + timedelta(days=self.trial_duration_days))

            # Ensure timezone consistency
            if current_trial_end and current_trial_end.tzinfo is None:
                current_trial_end = current_trial_end.replace(tzinfo=timezone.utc)

            new_trial_end = current_trial_end + timedelta(days=additional_days)
            
            user.trial_end = new_trial_end
            await session.commit()
            
            logger.info(f"Extended trial for user {user.username} by {additional_days} days")
            return True
            
        except Exception as e:
            logger.error(f"Failed to extend trial for user {user_id}: {e}")
            await session.rollback()
            return False
    
    async def reactivate_user(self, user_id: str, session: AsyncSession) -> bool:
        """Reactivate a user who was deactivated due to expired trial."""
        try:
            user = await get_user_by_id(session, user_id)
            if not user:
                return False
            
            user.is_active = True
            user.subscription_status = "trial"
            user.trial_start = datetime.now(timezone.utc)
            user.trial_end = None  # Will be calculated based on trial_start
            
            await session.commit()
            
            logger.info(f"Reactivated user {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reactivate user {user_id}: {e}")
            await session.rollback()
            return False


# Global instance
trial_service = TrialService()


async def run_trial_cleanup_task():
    """Background task to cleanup expired trials."""
    while True:
        try:
            logger.info("Running trial cleanup task...")
            cleanup_count = await trial_service.cleanup_expired_trials()
            logger.info(f"Trial cleanup completed. Cleaned up {cleanup_count} users.")
            
            # Run cleanup every 24 hours
            await asyncio.sleep(24 * 60 * 60)
            
        except Exception as e:
            logger.error(f"Error in trial cleanup task: {e}")
            # Wait 1 hour before retrying on error
            await asyncio.sleep(60 * 60)
