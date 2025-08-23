import React, { useState, useEffect } from "react";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { api } from "../../controllers/API/api";

interface ForgotPasswordStep {
  step: 'email' | 'code' | 'password' | 'success';
  email?: string;
}

export default function ForgotPasswordPage() {
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>({ step: 'email' });
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  const navigate = useCustomNavigate();

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/v1/email/forgot-password', { email });

      if (response.data) {
        setCurrentStep({ step: 'code', email });
        setSuccess('Password reset code sent! Check your email.');
        setCountdown(60); // 60 second cooldown
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to send password reset code';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/v1/email/verify-password-reset-code', {
        email: currentStep.email,
        code: verificationCode
      });

      if (response.data.verified) {
        setCurrentStep({ step: 'password', email: currentStep.email });
        setSuccess('Code verified! Now set your new password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/v1/email/change-password-with-code', {
        email: currentStep.email,
        code: verificationCode,
        new_password: newPassword
      });

      if (response.data.success) {
        setCurrentStep({ step: 'success' });
        setSuccess('Password changed successfully! You can now log in.');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await api.post('/api/v1/email/forgot-password', { email: currentStep.email });
      setSuccess('New password reset code sent!');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // Render functions for different steps
  const renderEmailStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
        <CardDescription>
          Enter your email address to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              Back to Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderCodeStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to<br />
          <strong>{currentStep.email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              6-Digit Code
            </label>
            <Input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              disabled={isLoading}
              className="text-center text-2xl tracking-widest"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Code expires in 10 minutes
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || verificationCode.length !== 6}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <div className="text-center space-y-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResendCode}
              disabled={countdown > 0 || isLoading}
              className="text-sm"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Button>
            <br />

            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep({ step: 'email' })}
              className="text-sm"
            >
              Change Email
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          Enter your new password for<br />
          <strong>{currentStep.email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !newPassword || !confirmPassword}>
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep({ step: 'code', email: currentStep.email })}
              className="text-sm"
            >
              Back to Code
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-green-600">Password Changed!</CardTitle>
        <CardDescription>
          Your password has been successfully changed.<br />
          Redirecting to login...
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="animate-spin mx-auto w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mb-4"></div>
        <p className="text-sm text-gray-600">
          You can now log in with your new password!
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://scontent-arn2-1.xx.fbcdn.net/v/t39.30808-6/499498872_122132145854766980_5268724011023190696_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=u5dFev5AG-kQ7kNvwFS6K3m&_nc_oc=AdltILxg_X65VXBn-MK3Z58PgtgR7ITbbYcGrvZSWDnQLiIitDDiDq9uw1DoamQT61U&_nc_zt=23&_nc_ht=scontent-arn2-1.xx&_nc_gid=mpLb2UFdGIvVDUjGf2bZuw&oh=00_AfXfUa1TAFSuNwQPVCsbeshZuHKq0TqnRwUgl4EdrFju9w&oe=68A94B99"
            alt="AxieStudio Logo"
            className="mx-auto w-16 h-16 rounded-full mb-4"
            onError={(e: any) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="mx-auto w-16 h-16 bg-black rounded-full items-center justify-center mb-4 hidden">
            <span className="text-white font-bold text-xl">AX</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AxieStudio</h1>
          <p className="text-gray-600">Password Reset</p>
        </div>

        {/* Render based on current step */}
        {currentStep.step === 'email' && renderEmailStep()}
        {currentStep.step === 'code' && renderCodeStep()}
        {currentStep.step === 'password' && renderPasswordStep()}
        {currentStep.step === 'success' && renderSuccessStep()}

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Need help? Contact our support team</p>
        </div>
      </div>
    </div>
  );
}
