"""
Enterprise 6-Digit Verification Code Service

Provides cryptographically secure 6-digit code generation and validation
following enterprise security standards used by Google, Microsoft, AWS, etc.
"""

import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def ensure_timezone_aware(dt: datetime | None) -> datetime | None:
    """
    Ensure a datetime is timezone-aware.

    This fixes the common issue where database datetimes are stored as naive
    but need to be compared with timezone-aware datetimes.

    Args:
        dt: Datetime that might be naive or aware

    Returns:
        datetime | None: Timezone-aware datetime or None
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        # Assume naive datetimes are in UTC (database default)
        return dt.replace(tzinfo=timezone.utc)

    return dt


class VerificationCodeService:
    """
    Enterprise-grade verification code service

    Features:
        - Cryptographically secure code generation
        - Configurable expiry times
        - Rate limiting support
        - Audit logging
    """

    # Enterprise configuration
    CODE_LENGTH = 6
    CODE_EXPIRY_MINUTES = 10  # Standard enterprise practice
    MAX_ATTEMPTS = 5  # Prevent brute force attacks

    @staticmethod
    def generate_verification_code() -> str:
        """
        Generate cryptographically secure 6-digit verification code

        Uses secrets module for cryptographic randomness (not random module)
        This is the same approach used by:
            - Google (2FA codes)
            - Microsoft (Azure verification)
            - AWS (account verification)
            - GitHub (2FA codes)

        Returns:
            str: 6-digit numeric code (e.g., "123456")
        """
        code = ''.join(secrets.choice(string.digits) for _ in range(VerificationCodeService.CODE_LENGTH))
        logger.info(f"Generated new verification code: {code[:2]}****")
        return code

    @staticmethod
    def get_code_expiry() -> datetime:
        """
        Get code expiration timestamp

        Enterprise standard: 10 minutes expiry
        - Short enough to prevent abuse
        - Long enough for user convenience

        Returns:
            datetime: UTC timestamp when code expires
        """
        expiry = datetime.now(timezone.utc) + timedelta(minutes=VerificationCodeService.CODE_EXPIRY_MINUTES)
        logger.debug(f"Code will expire at: {expiry}")
        return expiry

    @staticmethod
    def is_code_expired(expiry_time: datetime | None) -> bool:
        """
        Check if verification code has expired

        Args:
            expiry_time: When the code expires (UTC)

        Returns:
            bool: True if expired, False if still valid
        """
        if not expiry_time:
            return True

        # Ensure timezone-aware comparison to prevent offset-naive vs offset-aware errors
        expiry_time = ensure_timezone_aware(expiry_time)
        if not expiry_time:
            return True

        now = datetime.now(timezone.utc)
        expired = now > expiry_time

        if expired:
            logger.warning(f"Code expired at {expiry_time}, current time: {now}")
        else:
            remaining = expiry_time - now
            logger.debug(f"Code valid for {remaining.total_seconds():.0f} more seconds")

        return expired

    @staticmethod
    def validate_code_format(code: str) -> bool:
        """
        Validate code format (6 digits only)

        Args:
            code: User-provided code

        Returns:
            bool: True if format is valid
        """
        if not code:
            return False

        # Must be exactly 6 digits
        if len(code) != VerificationCodeService.CODE_LENGTH:
            logger.warning(f"Invalid code length: {len(code)} (expected {VerificationCodeService.CODE_LENGTH})")
            return False

        # Must be all digits
        if not code.isdigit():
            logger.warning(f"Code contains non-digit characters: {code}")
            return False

        return True

    @staticmethod
    def is_rate_limited(attempts: int) -> bool:
        """
        Check if user has exceeded maximum attempts

        Args:
            attempts: Number of failed verification attempts

        Returns:
            bool: True if rate limited
        """
        rate_limited = attempts >= VerificationCodeService.MAX_ATTEMPTS

        if rate_limited:
            logger.warning(f"Rate limit exceeded: {attempts}/{VerificationCodeService.MAX_ATTEMPTS} attempts")

        return rate_limited

    @staticmethod
    def get_remaining_attempts(current_attempts: int) -> int:
        """
        Get remaining verification attempts

        Args:
            current_attempts: Current number of failed attempts

        Returns:
            int: Number of attempts remaining
        """
        remaining = max(0, VerificationCodeService.MAX_ATTEMPTS - current_attempts)
        logger.debug(f"Remaining attempts: {remaining}/{VerificationCodeService.MAX_ATTEMPTS}")
        return remaining

    @staticmethod
    def create_verification_data() -> Tuple[str, datetime]:
        """
        Create complete verification data (code + expiry)

        Convenience method that generates both code and expiry time

        Returns:
            Tuple[str, datetime]: (verification_code, expiry_time)
        """
        code = VerificationCodeService.generate_verification_code()
        expiry = VerificationCodeService.get_code_expiry()

        logger.info(f"Created verification data - Code: {code[:2]}****, Expires: {expiry}")
        return code, expiry


# Convenience functions for easy import
def generate_code() -> str:
    """Generate a new 6-digit verification code"""
    return VerificationCodeService.generate_verification_code()


def create_verification() -> Tuple[str, datetime]:
    """Create code and expiry time"""
    return VerificationCodeService.create_verification_data()


def validate_code(code: str, stored_code: str, expiry: datetime | None, attempts: int) -> dict:
    """
    Complete code validation with enterprise security checks

    Args:
        code: User-provided code
        stored_code: Code stored in database
        expiry: When the code expires
        attempts: Current failed attempts

    Returns:
        dict: Validation result with detailed status
    """
    result = {
        "valid": False,
        "error": None,
        "remaining_attempts": VerificationCodeService.get_remaining_attempts(attempts),
        "rate_limited": False,
        "expired": False
    }

    # Check rate limiting first
    if VerificationCodeService.is_rate_limited(attempts):
        result["error"] = "Too many failed attempts. Please request a new code."
        result["rate_limited"] = True
        return result

    # Check code format
    if not VerificationCodeService.validate_code_format(code):
        result["error"] = "Invalid code format. Please enter 6 digits."
        return result

    # Check expiry
    if VerificationCodeService.is_code_expired(expiry):
        result["error"] = "Code has expired. Please request a new code."
        result["expired"] = True
        return result

    # Check code match
    if code != stored_code:
        result["error"] = f"Invalid code. {VerificationCodeService.get_remaining_attempts(attempts + 1)} attempts remaining."
        result["remaining_attempts"] = VerificationCodeService.get_remaining_attempts(attempts + 1)
        return result

    # Success!
    result["valid"] = True
    logger.info(f"Code validation successful")
    return result
