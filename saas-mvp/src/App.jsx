import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PlatformRoute from "./components/PlatformRoute.jsx";
import AcceptInvitePage from "./pages/AcceptInvitePage.jsx";
import FoundingRestaurantsPage from "./pages/FoundingRestaurantsPage.jsx";
import InviteTeamPage from "./pages/InviteTeamPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagedSetupPage from "./pages/ManagedSetupPage.jsx";
import ManagerBillingPage from "./pages/ManagerBillingPage.jsx";
import ManagerAssignmentsPage from "./pages/ManagerAssignmentsPage.jsx";
import ManagerCertificationsPage from "./pages/ManagerCertificationsPage.jsx";
import ManagerContentPage from "./pages/ManagerContentPage.jsx";
import ManagerCreateTrainingPage from "./pages/ManagerCreateTrainingPage.jsx";
import ManagerImportPage from "./pages/ManagerImportPage.jsx";
import ManagerManageLayout from "./pages/ManagerManageLayout.jsx";
import ManagerOnboardingPage from "./pages/ManagerOnboardingPage.jsx";
import ManagerQuizzesPage from "./pages/ManagerQuizzesPage.jsx";
import ManagerReadinessPage from "./pages/ManagerReadinessPage.jsx";
import PlatformControlPage from "./pages/PlatformControlPage.jsx";
import PlatformRestaurantHealthPage from "./pages/PlatformRestaurantHealthPage.jsx";
import PlatformSupportPage from "./pages/PlatformSupportPage.jsx";
import ReportIssuePage from "./pages/ReportIssuePage.jsx";
import StaffLibrary from "./pages/StaffLibrary.jsx";
import StudyHomePage from "./pages/StudyHomePage.jsx";
import TrialPage from "./pages/TrialPage.jsx";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage.jsx";
import { activeMemberRoles, adminManagerRoles as managerRoles, ownerAdminRoles } from "./lib/permissions.js";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/founding-restaurants" element={<FoundingRestaurantsPage />} />
        <Route path="/trial" element={<TrialPage />} />
        <Route path="/managed-setup" element={<ManagedSetupPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/platform"
          element={
            <PlatformRoute>
              <PlatformControlPage />
            </PlatformRoute>
          }
        />
        <Route
          path="/platform/support"
          element={
            <PlatformRoute ownerOnly>
              <PlatformSupportPage />
            </PlatformRoute>
          }
        />
        <Route
          path="/platform/restaurants/:restaurantId"
          element={
            <PlatformRoute ownerOnly>
              <PlatformRestaurantHealthPage />
            </PlatformRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <Navigate to="/home" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerManageLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="team" replace />} />
          <Route path="team" element={<ManagerAssignmentsPage />} />
          <Route path="invites" element={<InviteTeamPage />} />
          <Route path="readiness" element={<ManagerReadinessPage />} />
        </Route>
        <Route
          path="/manager/billing"
          element={
            <ProtectedRoute allowedRoles={ownerAdminRoles}>
              <ManagerBillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/create-training"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerCreateTrainingPage />
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
            <ProtectedRoute allowedRoles={ownerAdminRoles}>
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
          path="/manager/readiness"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <Navigate to="/manage/readiness" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/staff-progress"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <Navigate to="/manage/readiness" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/certifications"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <ManagerCertificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assignments"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <Navigate to="/manage/team" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/invite-team"
          element={
            <ProtectedRoute allowedRoles={managerRoles}>
              <Navigate to="/manage/invites" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <StudyHomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/staff" element={<Navigate to="/home" replace />} />
        <Route
          path="/library"
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
              <Navigate to="/library" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <Navigate to="/home" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <Navigate to="/home#leaderboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-progress"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <Navigate to="/home" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certifications"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <Navigate to="/home" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-issue"
          element={
            <ProtectedRoute allowedRoles={activeMemberRoles}>
              <ReportIssuePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
