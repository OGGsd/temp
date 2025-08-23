import * as Form from "@radix-ui/react-form";
import { useState } from "react";
import { CustomLink } from "@/customization/components/custom-link";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import useAlertStore from "../../stores/alertStore";
import { api } from "../../controllers/API/api";

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email.trim()) {
      setErrorData({
        title: "Email Required",
        list: ["Please enter your email address"],
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await api.post("/api/v1/email/forgot-password", {
        email: email.trim()
      });
      
      setIsSubmitted(true);
      setSuccessData({
        title: "If you own that email, you will receive a temporary password.",
      });
      
    } catch (error: any) {
      setErrorData({
        title: "Error",
        list: [error?.response?.data?.detail || "Failed to send temporary password. Please try again."],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
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
                  Check Your Email
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  If you own that email, you will receive a temporary password
                </p>
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📧 <strong>Check your email</strong> for your temporary password<br/>
                  🔑 <strong>Log in</strong> with your username and the temporary password<br/>
                  ⚙️ <strong>You'll be prompted</strong> to create a new password after login
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?{" "}
                  <button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Try again
                  </button>
                </p>
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

  return (
    <Form.Root onSubmit={handleSubmit} className="h-screen w-full">
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex w-96 flex-col items-center justify-center gap-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/logo192.png"
              alt="Axie Studio logo"
              className="h-12 w-12 rounded-xl object-contain"
              onError={(e) => {
                // Fallback to text logo if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl items-center justify-center font-bold text-lg hidden">
              AS
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-light text-foreground tracking-tight">
                Forgot Password?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send you a temporary password
              </p>
            </div>
          </div>
          
          <div className="w-full space-y-5">
            <Form.Field name="email">
              <Form.Label className="text-sm font-medium text-foreground data-[invalid]:text-destructive">
                Email Address
              </Form.Label>
              <Form.Control asChild>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 mt-2 border-border/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                  required
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="text-xs text-destructive mt-1">
                Please enter your email address
              </Form.Message>
              <Form.Message match="typeMismatch" className="text-xs text-destructive mt-1">
                Please enter a valid email address
              </Form.Message>
            </Form.Field>

            <Form.Submit asChild>
              <Button
                className="w-full h-11 mt-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Temporary Password"}
              </Button>
            </Form.Submit>

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <CustomLink to="/login" className="text-primary hover:underline font-medium">
                  Back to login
                </CustomLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Form.Root>
  );
}
