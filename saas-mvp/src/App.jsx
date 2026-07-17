import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AcceptInvitePage from "./pages/AcceptInvitePage.jsx";
import InviteTeamPage from "./pages/InviteTeamPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagedSetupPage from "./pages/ManagedSetupPage.jsx";
import ManagerBillingPage from "./pages/ManagerBillingPage.jsx";
import ManagerContentPage from "./pages/ManagerContentPage.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ManagerImportPage from "./pages/ManagerImportPage.jsx";
import ManagerOnboardingPage from "./pages/ManagerOnboardingPage.jsx";
import ManagerQuizzesPage from "./pages/ManagerQuizzesPage.jsx";
import ManagerStaffProgressPage from "./pages/ManagerStaffProgressPage.jsx";
import MyProgressPage from "./pages/MyProgressPage.jsx";
import ComingSoonPage from "./pages/placeholders/ComingSoonPage.jsx";
import StaffLibrary from "./pages/StaffLibrary.jsx";
import StaffQuizzesPage from "./pages/StaffQuizzesPage.jsx";
import TrialPage from "./pages/TrialPage.jsx";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage.jsx";
import { activeMemberRoles, adminManagerRoles as managerRoles, ownerAdminRoles } from "./lib/permissions.js";

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
          path="/manager/billing"
          element={
            <ProtectedRoute allowedRoles={ownerAdminRoles}>
              <ManagerBillingPage />
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
          path="/manager/import"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/onboarding"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/settings"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <WorkspaceSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/quizzes"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerQuizzesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/staff-progress"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerStaffProgressPage />
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
              <StaffQuizzesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-progress"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <MyProgressPage />
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
