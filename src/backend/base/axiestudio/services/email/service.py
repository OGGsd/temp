"""
Enterprise Email Service with Professional Templates
Clean, professional email templates without emojis
"""

import smtplib
import secrets
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any

from axiestudio.logging import logger

from axiestudio.services.settings.email import EmailSettings
from axiestudio.services.deps import get_settings_service


class EmailService:
    """
    Enterprise-grade email service using SMTP.

    Features:
    - Professional email templates without emojis
    - Email verification codes
    - Password reset emails
    - Comprehensive error handling
    - Security best practices
    """

    def __init__(self):
        self.settings = EmailSettings()
        self._validate_configuration()

    def _validate_configuration(self) -> None:
        """Validate email configuration on startup."""
        if not self.settings.SMTP_HOST:
            logger.warning("SMTP_HOST not configured. Email functionality will be disabled.")

        if not self.settings.SMTP_USER or not self.settings.SMTP_PASSWORD:
            logger.warning("SMTP credentials not configured. Email functionality will be disabled.")

        if not self.settings.FROM_EMAIL:
            logger.warning("FROM_EMAIL not configured. Email functionality will be disabled.")

    async def health_check(self) -> Dict[str, Any]:
        """Check email service health."""
        try:
            health_status = {
                "service": "email",
                "status": "healthy",
                "smtp_host": self.settings.SMTP_HOST,
                "smtp_port": self.settings.SMTP_PORT,
                "from_email": self.settings.FROM_EMAIL,
                "issues": []
            }

            if not self.settings.SMTP_HOST:
                health_status["issues"].append("SMTP_HOST not configured")
                health_status["status"] = "degraded"

            if not self.settings.SMTP_USER or not self.settings.SMTP_PASSWORD:
                health_status["issues"].append("SMTP credentials not configured")
                health_status["status"] = "degraded"

            if not self.settings.FROM_EMAIL or "@" not in self.settings.FROM_EMAIL:
                health_status["issues"].append("Invalid FROM_EMAIL configuration")
                health_status["status"] = "degraded"

            return health_status

        except Exception as e:
            logger.error(f"Email service health check failed: {e}")
            return {
                "service": "email",
                "status": "unhealthy",
                "error": str(e)
            }

    def generate_verification_token(self) -> str:
        """Generate a secure verification token."""
        return secrets.token_urlsafe(32)

    def get_verification_expiry(self) -> datetime:
        """Get verification token expiry time (24 hours from now)."""
        return datetime.now(timezone.utc) + timedelta(hours=24)

    async def send_verification_code_email(self, email: str, username: str, verification_code: str) -> bool:
        """Send 6-digit verification code email with professional template."""
        try:
            subject = "Verify your AxieStudio account"
            
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your AxieStudio account</title>
    <style>
    body {{
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1a202c;
        max-width: 600px;
        margin: 0 auto;
        padding: 0;
        background-color: #f7fafc;
    }}
    .email-container {{
        background: #ffffff;
        margin: 20px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }}
    .header {{
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 40px 30px;
        text-align: center;
        color: white;
    }}
    .verification-code {{
        background: #f7fafc;
        border: 2px solid #e2e8f0;
        color: #2d3748;
        font-size: 36px;
        font-weight: 700;
        text-align: center;
        padding: 24px;
        border-radius: 8px;
        letter-spacing: 6px;
        margin: 30px 0;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Email Verification</h1>
            <p>Welcome to AxieStudio</p>
        </div>
        <div style="padding: 40px;">
            <p>Dear <strong>{username}</strong>,</p>
            <p>Thank you for creating your AxieStudio account. Please enter the verification code below:</p>
            <div class="verification-code">{verification_code}</div>
            <p>This code expires in 10 minutes.</p>
            <p>Best regards,<br>The AxieStudio Team</p>
        </div>
    </div>
</body>
</html>
            """

            text_body = f"""
AxieStudio - Email Verification

Hello {username},

Thank you for signing up for AxieStudio. Please use this verification code:

Verification Code: {verification_code}

This code expires in 10 minutes.

Best regards,
The AxieStudio Team
            """

            success = await self._send_email(email, subject, text_body, html_body)
            
            if success:
                logger.info(f"Verification code email sent successfully to {email}")
            else:
                logger.error(f"Failed to send verification code email to {email}")

            return success

        except Exception as e:
            logger.exception(f"Error sending verification code email to {email}: {e}")
            return False

    async def _send_email(self, to_email: str, subject: str, text_body: str, html_body: str) -> bool:
        """Send email using SMTP with enterprise-level error handling and security."""
        try:
            # Validate email settings
            if not self.settings.SMTP_USER or not self.settings.SMTP_PASSWORD:
                logger.error("SMTP credentials not configured")
                return False

            if not self.settings.FROM_EMAIL or "@" not in self.settings.FROM_EMAIL:
                logger.error("Invalid FROM_EMAIL configuration")
                return False

            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.settings.FROM_EMAIL
            msg['To'] = to_email

            # Create text and HTML parts
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            html_part = MIMEText(html_body, 'html', 'utf-8')

            # Add parts to message
            msg.attach(text_part)
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.settings.SMTP_HOST, self.settings.SMTP_PORT) as server:
                server.starttls()
                server.login(self.settings.SMTP_USER, self.settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.exception(f"Unexpected error sending email to {to_email}: {e}")
            return False


# Global email service instance
email_service = EmailService()
