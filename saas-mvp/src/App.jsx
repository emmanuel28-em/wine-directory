import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import PublicLibraryPage from "./pages/PublicLibraryPage.jsx";

// Line Up currently has one intentionally simple public experience: the library.
// The older account, quiz, and management files remain in the project so no work is
// lost, but they are not exposed as routes while the product is read-only.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PublicLibraryPage />} />
        <Route path="/library" element={<PublicLibraryPage />} />
        <Route path="/training-library" element={<PublicLibraryPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
