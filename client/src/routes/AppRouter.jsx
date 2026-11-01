import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";

import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import OnboardingPage from "../pages/OnboardingPage";
import DashboardPage from "../pages/DashboardPage";
import HealthPage from "../pages/HealthPage";
import WealthPage from "../pages/WealthPage";
import SimulatorPage from "../pages/SimulatorPage";
import ProjectionsPage from "../pages/ProjectionsPage";
import GoalsPage from "../pages/GoalsPage";
import AIGuidePage from "../pages/AIGuidePage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import ProfilePage from "../pages/ProfilePage";
import HealthProfilePage from "../pages/HealthProfilePage";
import WealthProfilePage from "../pages/WealthProfilePage";

/**
 * Central route table. Each authenticated page's title/subtitle is
 * attached via `handle` rather than the page rendering its own <Header> —
 * AppLayout reads `handle` and renders the header once, so no page ever
 * duplicates that markup. See components/layout/AppLayout.jsx.
 */
const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
            handle: { title: "Dashboard" },
          },
          {
            path: "/health",
            element: <HealthPage />,
            handle: { title: "Health" },
          },
          {
            path: "/wealth",
            element: <WealthPage />,
            handle: { title: "Wealth" },
          },
          {
            path: "/simulator",
            element: <SimulatorPage />,
            handle: { title: "What-If Simulator" },
          },
          {
            path: "/projections",
            element: <ProjectionsPage />,
            handle: { title: "Charts & Projections" },
          },
          {
            path: "/goals",
            element: <GoalsPage />,
            handle: { title: "Goals" },
          },
          {
            path: "/ai-guide",
            element: <AIGuidePage />,
            handle: { title: "AI Guide" },
          },
          {
            path: "/reports",
            element: <ReportsPage />,
            handle: { title: "Reports" },
          },
          {
            path: "/health-profile",
            element: <HealthProfilePage />,
            handle: { title: "Health Profile" },
          },
          {
            path: "/wealth-profile",
            element: <WealthProfilePage />,
            handle: { title: "Wealth Profile" },
          },
          {
            path: "/profile",
            element: <ProfilePage />,
            handle: { title: "Profile" },
          },
          {
            path: "/settings",
            element: <SettingsPage />,
            handle: { title: "Settings" },
          },
        ],
      },
    ],
  },
]);

export default router;
