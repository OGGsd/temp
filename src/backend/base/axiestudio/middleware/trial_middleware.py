"""Middleware to check trial status and restrict access for expired users."""

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from axiestudio.logging import logger

from axiestudio.services.trial.service import trial_service
from axiestudio.services.auth.utils import get_current_user_by_jwt
from axiestudio.services.deps import get_db_service


class TrialMiddleware(BaseHTTPMiddleware):
    """Middleware to check user trial status and restrict access."""

    def __init__(self, app):
        super().__init__(app)
        # Paths that should be accessible even with expired trial
        self.exempt_paths = {
            "/api/v1/subscriptions",
            "/api/v1/login",
            "/api/v1/logout",
            "/api/v1/refresh",
            "/api/v1/users/whoami",
            "/api/v1/users/",  # Allow user creation (signup)
            "/pricing",
            "/login",
            "/signup",
            "/health",
            "/docs",
            "/openapi.json",
            "/static",
        }

        # Paths that should be completely exempt from trial checks
        self.always_allow_paths = {
            "/health",
            "/docs",
            "/openapi.json",
            "/static",
            "/login",
            "/signup",
            "/pricing",
        }
    
    async def dispatch(self, request: Request, call_next):
        """Check trial status before processing request."""

        try:
            # Always allow certain paths without any checks
            if any(request.url.path.startswith(path) for path in self.always_allow_paths):
                return await call_next(request)

            # Skip trial check for exempt paths
            if any(request.url.path.startswith(path) for path in self.exempt_paths):
                return await call_next(request)

            # Skip trial check for non-API requests (static files, etc.)
            if not request.url.path.startswith("/api/"):
                return await call_next(request)

            # Get authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                # No auth token, let the auth middleware handle it
                return await call_next(request)

            # Extract token
            token = auth_header.split(" ")[1]

            # Get user from token
            db_service = get_db_service()
            if not db_service:
                logger.warning("Database service not available, skipping trial check")
                return await call_next(request)

            async with db_service.with_session() as session:
                try:
                    user = await get_current_user_by_jwt(token, session)
                except Exception as e:
                    # If JWT validation fails, let the auth middleware handle it
                    logger.debug(f"JWT validation failed in trial middleware: {e}")
                    return await call_next(request)

                if not user:
                    return await call_next(request)

                # Skip trial check for superusers
                if user.is_superuser:
                    return await call_next(request)

                # Check trial status
                try:
                    trial_status = await trial_service.check_trial_status(user)

                    # If trial expired and no subscription, block access
                    if trial_status.get("should_cleanup", False):
                        logger.info(f"Blocking access for expired trial user: {user.username}")
                        return JSONResponse(
                            status_code=status.HTTP_402_PAYMENT_REQUIRED,
                            content={
                                "detail": "Your free trial has expired. Please subscribe to continue using Axie Studio.",
                                "trial_expired": True,
                                "subscription_required": True,
                                "redirect_to": "/pricing"
                            }
                        )

                    # Add trial info to request state for use in endpoints
                    request.state.trial_status = trial_status
                    request.state.user = user

                except Exception as e:
                    # If trial service fails, let the request proceed
                    # This prevents trial service issues from breaking the app
                    logger.warning(f"Trial service error, allowing request: {e}")
                    pass

        except Exception as e:
            # If there's any error in middleware, let the request proceed
            # The auth middleware will handle authentication errors properly
            logger.warning(f"Trial middleware error, allowing request: {e}")
            pass

        return await call_next(request)
