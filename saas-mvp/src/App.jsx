import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AcceptInvitePage from "./pages/AcceptInvitePage.jsx";
import InviteTeamPage from "./pages/InviteTeamPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagedSetupPage from "./pages/ManagedSetupPage.jsx";
import ManagerContentPage from "./pages/ManagerContentPage.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ComingSoonPage from "./pages/placeholders/ComingSoonPage.jsx";
import StaffLibrary from "./pages/StaffLibrary.jsx";
import TrialPage from "./pages/TrialPage.jsx";

const managerRoles = ["owner", "admin", "manager"];
const activeMemberRoles = ["owner", "admin", "manager", "staff"];

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/trial" element={<TrialPage />} />
        <Route path="/managed-setup" element={<ManagedSetupPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/content"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerContentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/settings"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ComingSoonPage page="settings" backTo="/manager" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/staff-progress"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ComingSoonPage page="staffProgress" backTo="/manager" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/invite-team"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <InviteTeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <StaffLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training-library"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <StaffLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <ComingSoonPage page="quizzes" backTo="/training-library" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-progress"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <ComingSoonPage page="myProgress" backTo="/training-library" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-issue"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <ComingSoonPage page="reportIssue" backTo="/training-library" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
