import { useContext, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
// Icons removed for clean professional look
import { useCustomNavigate } from "../../customization/hooks/use-custom-navigate";
import { CustomLink } from "../../customization/components/custom-link";
import { AuthContext } from "../../contexts/authContext";
import { api } from "../../controllers/API/api";

interface VerificationStep {
  step: 'email' | 'code' | 'success' | 'token-verify';
  email?: string;
}

export default function EmailVerificationPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useCustomNavigate();
  const { login } = useContext(AuthContext);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  // NEW: 6-digit code verification state
  const [currentStep, setCurrentStep] = useState<VerificationStep>({ step: 'email' });
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const token = searchParams.get("token");

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (token) {
      // Legacy token-based verification
      setCurrentStep({ step: 'token-verify' });
      verifyEmail(token);
    } else {
      // New 6-digit code verification flow
      setCurrentStep({ step: 'email' });
      setStatus("loading"); // Reset status for code flow
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await api.get(`/api/v1/email/verify?token=${verificationToken}`);

      if (response.data.verified) {
        setStatus("success");

        // Check if auto-login tokens are provided
        if (response.data.access_token && response.data.auto_login) {
          // Log the user in automatically
          login(response.data.access_token, "email_verification", response.data.refresh_token);
          setMessage("Email verified successfully! You are now logged in. Redirecting to dashboard...");

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else {
          setMessage("Email verified successfully! You can now log in to your account.");
        }
      } else {
        setStatus("error");
        setMessage("Email verification failed. Please try again.");
      }
    } catch (error: any) {
      setStatus("error");
      const errorMessage = error?.response?.data?.detail || "Email verification failed. The link may be expired or invalid.";
      setMessage(errorMessage);
    }
  };

  const resendVerificationEmail = async () => {
    const email = prompt("Please enter your email address to resend verification:");
    
    if (!email) return;

    setIsResending(true);
    
    try {
      await api.post(`/api/v1/email/resend-verification`, { email });
      setMessage("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || "Failed to resend verification email.";
      setMessage(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const goToLogin = () => {
    navigate("/login");
  };

  // NEW: 6-digit code verification functions
  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/v1/email/resend-code', { email });

      if (response.data) {
        setCurrentStep({ step: 'code', email });
        setSuccess('Verification code sent! Check your email.');
        setCountdown(60); // 60 second cooldown
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to send verification code';
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
      const response = await api.post('/api/v1/email/verify-code', {
        email: currentStep.email,
        code: verificationCode
      });

      if (response.data) {
        // Auto-login if tokens provided
        if (response.data.access_token) {
          login(response.data.access_token, "email_verification", response.data.refresh_token);
        }

        setCurrentStep({ step: 'success' });
        setSuccess('Account activated successfully!');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      const errorData = err.response?.data?.detail;
      let errorMessage = 'Invalid verification code';

      if (typeof errorData === 'object') {
        errorMessage = errorData.message || errorMessage;
        if (errorData.remaining_attempts !== undefined) {
          errorMessage += ` (${errorData.remaining_attempts} attempts remaining)`;
        }
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await api.post('/api/v1/email/resend-code', { email: currentStep.email });
      setSuccess('New verification code sent!');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Render functions for 6-digit code flow
  const renderEmailStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Account Not Activated?</CardTitle>
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
            {isLoading ? 'Verifying...' : 'Verify & Activate Account'}
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

  const renderSuccessStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-green-600">Account Activated!</CardTitle>
        <CardDescription>
          Your account has been successfully activated.<br />
          Redirecting to dashboard...
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="animate-spin mx-auto w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mb-4"></div>
        <p className="text-sm text-gray-600">
          You can now access all features of AxieStudio!
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">AX</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AxieStudio</h1>
          <p className="text-gray-600">Email Verification</p>
        </div>

        {/* Render based on current step */}
        {currentStep.step === 'email' && renderEmailStep()}
        {currentStep.step === 'code' && renderCodeStep()}
        {currentStep.step === 'success' && renderSuccessStep()}

        {/* Legacy token-based verification */}
        {currentStep.step === 'token-verify' && (
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Email Verification
              </h1>
          
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Verifying your email address...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={goToLogin} className="w-full">
                Go to Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              
              <div className="flex flex-col space-y-2 w-full">
                <Button 
                  onClick={resendVerificationEmail} 
                  variant="outline" 
                  className="w-full"
                  disabled={isResending}
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </Button>
                
                <CustomLink to="/login" className="text-center">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </CustomLink>
              </div>
            </div>
          )}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Need help? Contact our support team</p>
        </div>
      </div>
    </div>
  );
}
