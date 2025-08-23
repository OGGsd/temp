import { useEffect, useState, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { CustomLink } from "@/customization/components/custom-link";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import { Button } from "../../components/ui/button";
import useAlertStore from "../../stores/alertStore";
import { AuthContext } from "../../contexts/authContext";
import { api } from "../../controllers/API/api";

export default function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useCustomNavigate();
  const { login } = useContext(AuthContext);
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      setIsLoading(false);
      return;
    }

    handlePasswordReset();
  }, [token]);

  const handlePasswordReset = async () => {
    try {
      const response = await api.get(`/api/v1/email/reset-password?token=${token}`);
      
      if (response.data.access_token) {
        // Log the user in automatically
        login(response.data.access_token, "password_reset", response.data.refresh_token);
        
        setIsSuccess(true);
        setSuccessData({
          title: "Password reset successful! You are now logged in. Please go to Settings to change your password.",
        });
        
        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate("/settings");
        }, 3000);
      }
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || "Invalid or expired reset link.";
      setError(errorMessage);
      setErrorData({
        title: "Password Reset Failed",
        list: [errorMessage],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full">
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30">
          <div className="flex w-96 flex-col items-center justify-center gap-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-light text-foreground tracking-tight">
                  Processing Reset Link...
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we verify your reset token
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="h-screen w-full">
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30">
          <div className="flex w-96 flex-col items-center justify-center gap-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 bg-green-500 text-white rounded-xl flex items-center justify-center">
                ✓
              </div>
              <div>
                <h1 className="text-2xl font-light text-foreground tracking-tight">
                  Password Reset Successful!
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  You are now logged in to your account
                </p>
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>You're logged in!</strong><br/>
                  <strong>Set a new password</strong> to secure your account<br/>
                  <strong>Choose a strong password</strong> to keep your account safe
                </p>
              </div>

              <Button
                onClick={() => navigate("/change-password?from_reset=true")}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                Set New Password
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <CustomLink to="/" className="text-primary hover:underline font-medium">
                    Continue to Dashboard
                  </CustomLink>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full">
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30">
          <div className="flex w-96 flex-col items-center justify-center gap-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 bg-red-500 text-white rounded-xl flex items-center justify-center">
                ✕
              </div>
              <div>
                <h1 className="text-2xl font-light text-foreground tracking-tight">
                  Reset Link Invalid
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {error}
                </p>
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  🚨 <strong>This reset link is invalid or expired</strong><br/>
                  🔗 <strong>Request a new reset link</strong> from the login page<br/>
                  ⏰ <strong>Reset links expire after 24 hours</strong>
                </p>
              </div>
              
              <Button 
                onClick={() => navigate("/forgot-password")}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                Request New Reset Link
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <CustomLink to="/login" className="text-primary hover:underline font-medium">
                    Back to login
                  </CustomLink>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div></div>;
}
