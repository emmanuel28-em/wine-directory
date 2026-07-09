import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagedSetupPage from "./pages/ManagedSetupPage.jsx";
import ManagerContentPage from "./pages/ManagerContentPage.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import StaffLibrary from "./pages/StaffLibrary.jsx";
import TrialPage from "./pages/TrialPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/trial" element={<TrialPage />} />
        <Route path="/managed-setup" element={<ManagedSetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/content"
          element={
            <ProtectedRoute>
              <ManagerContentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffLibrary />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
