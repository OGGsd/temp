"""Stripe service for handling subscriptions and payments."""

import os
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    stripe = None

from axiestudio.logging import logger

from axiestudio.services.database.models.user.model import User, UserUpdate
from axiestudio.services.database.models.user.crud import update_user


class StripeService:
    """Service for handling Stripe operations."""
    
    def __init__(self):
        """Initialize Stripe service with API key."""
        if not STRIPE_AVAILABLE:
            logger.warning("Stripe package not available - Stripe functionality will be disabled")
            self.stripe_secret_key = None
            self.stripe_price_id = None
            self.is_railway = False
            return

        self.stripe_secret_key = os.getenv("STRIPE_SECRET_KEY")
        self.stripe_price_id = os.getenv("STRIPE_PRICE_ID")
        self.is_railway = os.getenv("RAILWAY_ENVIRONMENT") == "production"

        if not self.stripe_secret_key:
            logger.warning("STRIPE_SECRET_KEY not found - Stripe functionality will be disabled")
            return

        if not self.stripe_price_id:
            logger.warning("STRIPE_PRICE_ID not found - using default price ID")
            self.stripe_price_id = "price_1RxD0RBacFXEnBmNI6T0IkOd"

        stripe.api_key = self.stripe_secret_key
        logger.info(f"Stripe service initialized for {'production' if self.is_railway else 'development'} environment")

    def is_configured(self) -> bool:
        """Check if Stripe is properly configured."""
        return bool(STRIPE_AVAILABLE and self.stripe_secret_key and self.stripe_price_id)
    
    async def create_customer(self, email: str, name: str) -> str:
        """Create a Stripe customer."""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"source": "axiestudio"}
            )
            logger.info(f"Created Stripe customer: {customer.id}")
            return customer.id
        except Exception as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise
    
    async def create_checkout_session(
        self, 
        customer_id: str, 
        success_url: str, 
        cancel_url: str,
        trial_days: int = 7
    ) -> str:
        """Create a Stripe checkout session with trial."""
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': self.stripe_price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                subscription_data={
                    'trial_period_days': trial_days,
                    'metadata': {
                        'source': 'axiestudio'
                    }
                },
                allow_promotion_codes=True,
            )
            logger.info(f"Created checkout session: {session.id}")
            return session.url
        except Exception as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise
    
    async def create_customer_portal_session(self, customer_id: str, return_url: str) -> str:
        """Create a Stripe customer portal session."""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            logger.info(f"Created customer portal session: {session.id}")
            return session.url
        except Exception as e:
            logger.error(f"Failed to create customer portal session: {e}")
            raise
    
    async def get_subscription(self, subscription_id: str) -> Optional[dict]:
        """Get subscription details from Stripe."""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                'id': subscription.id,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start, tz=timezone.utc),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end, tz=timezone.utc),
                'trial_start': datetime.fromtimestamp(subscription.trial_start, tz=timezone.utc) if subscription.trial_start else None,
                'trial_end': datetime.fromtimestamp(subscription.trial_end, tz=timezone.utc) if subscription.trial_end else None,
                'customer_id': subscription.customer
            }
        except Exception as e:
            logger.error(f"Failed to get subscription: {e}")
            return None
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription."""
        try:
            stripe.Subscription.delete(subscription_id)
            logger.info(f"Cancelled subscription: {subscription_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel subscription: {e}")
            return False
    
    async def handle_webhook_event(self, event_data: dict, session) -> bool:
        """Handle Stripe webhook events."""
        try:
            event_type = event_data.get('type')
            data = event_data.get('data', {}).get('object', {})
            
            if event_type == 'customer.subscription.created':
                await self._handle_subscription_created(data, session)
            elif event_type == 'customer.subscription.updated':
                await self._handle_subscription_updated(data, session)
            elif event_type == 'customer.subscription.deleted':
                await self._handle_subscription_deleted(data, session)
            elif event_type == 'invoice.payment_succeeded':
                await self._handle_payment_succeeded(data, session)
            elif event_type == 'invoice.payment_failed':
                await self._handle_payment_failed(data, session)
            
            return True
        except Exception as e:
            logger.error(f"Failed to handle webhook event: {e}")
            return False
    
    async def _handle_subscription_created(self, subscription_data: dict, session):
        """Handle subscription created event."""
        customer_id = subscription_data.get('customer')
        subscription_id = subscription_data.get('id')
        status = subscription_data.get('status')
        
        # Find user by Stripe customer ID
        from axiestudio.services.database.models.user.crud import get_user_by_stripe_customer_id
        user = await get_user_by_stripe_customer_id(session, customer_id)
        
        if user:
            trial_end = None
            if subscription_data.get('trial_end'):
                trial_end = datetime.fromtimestamp(subscription_data['trial_end'], tz=timezone.utc)
            
            update_data = UserUpdate(
                subscription_id=subscription_id,
                subscription_status=status,
                trial_end=trial_end,
                subscription_start=datetime.fromtimestamp(subscription_data['current_period_start'], tz=timezone.utc),
                subscription_end=datetime.fromtimestamp(subscription_data['current_period_end'], tz=timezone.utc)
            )
            await update_user(session, user.id, update_data)
            logger.info(f"Updated user {user.id} with subscription {subscription_id}")
    
    async def _handle_subscription_updated(self, subscription_data: dict, session):
        """Handle subscription updated event."""
        await self._handle_subscription_created(subscription_data, session)  # Same logic
    
    async def _handle_subscription_deleted(self, subscription_data: dict, session):
        """Handle subscription deleted event."""
        customer_id = subscription_data.get('customer')
        
        from axiestudio.services.database.models.user.crud import get_user_by_stripe_customer_id
        user = await get_user_by_stripe_customer_id(session, customer_id)
        
        if user:
            update_data = UserUpdate(
                subscription_status='canceled',
                subscription_id=None
            )
            await update_user(session, user.id, update_data)
            logger.info(f"Cancelled subscription for user {user.id}")
    
    async def _handle_payment_succeeded(self, invoice_data: dict, session):
        """Handle successful payment."""
        subscription_id = invoice_data.get('subscription')
        if subscription_id:
            subscription_data = await self.get_subscription(subscription_id)
            if subscription_data:
                await self._handle_subscription_updated(subscription_data, session)
    
    async def _handle_payment_failed(self, invoice_data: dict, session):
        """Handle failed payment."""
        customer_id = invoice_data.get('customer')
        
        from axiestudio.services.database.models.user.crud import get_user_by_stripe_customer_id
        user = await get_user_by_stripe_customer_id(session, customer_id)
        
        if user:
            update_data = UserUpdate(subscription_status='past_due')
            await update_user(session, user.id, update_data)
            logger.info(f"Marked user {user.id} as past due")


# Global instance
stripe_service = StripeService()
