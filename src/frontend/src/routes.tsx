import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/authorization/authGuard";
import { ProtectedAdminRoute } from "@/components/authorization/authAdminGuard";
import { ProtectedLoginRoute } from "@/components/authorization/authLoginGuard";
import { StoreGuard } from "@/components/authorization/storeGuard";

// Page imports
import AdminPage from "@/pages/AdminPage";
import AppAuthenticatedPage from "@/pages/AppAuthenticatedPage";
import AppInitPage from "@/pages/AppInitPage";
import AppWrapperPage from "@/pages/AppWrapperPage";
import AxieStudioStorePage from "@/pages/AxieStudioStorePage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import DashboardWrapperPage from "@/pages/DashboardWrapperPage";
import DeleteAccountPage from "@/pages/DeleteAccountPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";
import FlowPage from "@/pages/FlowPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import LoginPage from "@/pages/LoginPage";
import MainPage from "@/pages/MainPage";
import Playground from "@/pages/Playground";
import PricingPage from "@/pages/PricingPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SettingsPage from "@/pages/SettingsPage";
import GeneralPage from "@/pages/SettingsPage/pages/GeneralPage";
import GlobalVariablesPage from "@/pages/SettingsPage/pages/GlobalVariablesPage";
import LocalLLMsPage from "@/pages/SettingsPage/pages/LocalLLMsPage";
import MCPServersPage from "@/pages/SettingsPage/pages/MCPServersPage";
import MessagesPage from "@/pages/SettingsPage/pages/messagesPage";
import ShortcutsPage from "@/pages/SettingsPage/pages/ShortcutsPage";
import SubscriptionPage from "@/pages/SettingsPage/pages/SubscriptionPage";
import ShowcasePage from "@/pages/ShowcasePage";
import SignUpPage from "@/pages/SignUpPage";
import StorePage from "@/pages/StorePage";
import SubscriptionSuccessPage from "@/pages/SubscriptionSuccessPage";
import ViewPage from "@/pages/ViewPage";

// Custom route components
import { CustomRoutesStorePages } from "@/customization/utils/custom-routes-store-pages";
import { CustomRoutesStore } from "@/customization/utils/custom-routes-store";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppWrapperPage />,
    children: [
      {
        path: "",
        element: <AppInitPage />,
      },
      {
        path: "login",
        element: (
          <ProtectedLoginRoute>
            <LoginPage />
          </ProtectedLoginRoute>
        ),
      },
      {
        path: "signup",
        element: (
          <ProtectedLoginRoute>
            <SignUpPage />
          </ProtectedLoginRoute>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <ProtectedLoginRoute>
            <ForgotPasswordPage />
          </ProtectedLoginRoute>
        ),
      },
      {
        path: "reset-password",
        element: (
          <ProtectedLoginRoute>
            <ResetPasswordPage />
          </ProtectedLoginRoute>
        ),
      },
      {
        path: "verify-email",
        element: <EmailVerificationPage />,
      },
      {
        path: "change-password",
        element: (
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "delete-account",
        element: (
          <ProtectedRoute>
            <DeleteAccountPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "pricing",
        element: <PricingPage />,
      },
      {
        path: "subscription-success",
        element: (
          <ProtectedRoute>
            <SubscriptionSuccessPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedAdminRoute>
            <AdminPage />
          </ProtectedAdminRoute>
        ),
      },
      {
        path: "",
        element: (
          <ProtectedRoute>
            <AppAuthenticatedPage />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "",
            element: <DashboardWrapperPage />,
            children: [
              {
                path: "home",
                element: <MainPage />,
              },
              {
                path: "home/:folderId",
                element: <MainPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
                children: [
                  {
                    path: "general",
                    element: <GeneralPage />,
                  },
                  {
                    path: "local-llms",
                    element: <LocalLLMsPage />,
                  },
                  {
                    path: "global-variables",
                    element: <GlobalVariablesPage />,
                  },
                  {
                    path: "mcp-servers",
                    element: <MCPServersPage />,
                  },
                  {
                    path: "shortcuts",
                    element: <ShortcutsPage />,
                  },
                  {
                    path: "messages",
                    element: <MessagesPage />,
                  },
                  {
                    path: "subscription",
                    element: <SubscriptionPage />,
                  },
                ],
              },
              {
                path: "playground",
                element: <Playground />,
              },
              // Store routes
              {
                path: "store",
                element: (
                  <StoreGuard>
                    <StorePage />
                  </StoreGuard>
                ),
              },
              {
                path: "store/:id",
                element: (
                  <StoreGuard>
                    <StorePage />
                  </StoreGuard>
                ),
              },
              {
                path: "axiestudio-store",
                element: <AxieStudioStorePage />,
              },
              {
                path: "axiestudio-store/:id",
                element: <AxieStudioStorePage />,
              },
              {
                path: "showcase",
                element: <ShowcasePage />,
              },
            ],
          },
          {
            path: "flow/:id",
            element: <FlowPage />,
          },
          {
            path: "view/:id",
            element: <ViewPage />,
          },
        ],
      },
    ],
  },
]);

export default router;