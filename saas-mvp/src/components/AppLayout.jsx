import { NavLink, Outlet } from "react-router-dom";
import AmplifySetupNotice from "./AmplifySetupNotice.jsx";

export default function AppLayout() {
  return (
    <div className="app-shell public-app-shell">
      <header className="site-header public-site-header">
        <NavLink className="brand" to="/library" aria-label="Line Up training library">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-l">L</span>
            <span className="brand-u">U</span>
          </span>
          <span>
            <strong>Line Up</strong>
            <small>Rezdora Training Library</small>
          </span>
        </NavLink>

        <nav className="main-nav public-main-nav" aria-label="Main navigation">
          <NavLink to="/library">Training Library</NavLink>
        </nav>
      </header>

      <AmplifySetupNotice />

      <main>
        <Outlet />
      </main>
    </div>
  );
}
