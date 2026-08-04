import { NavLink, Outlet } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";

export default function ManagerManageLayout() {
  const workspace = useCurrentWorkspace();

  return (
    <section className="manage-workspace">
      <header className="manage-workspace-header">
        <div>
          <p className="eyebrow">{workspace.restaurant?.name || "Restaurant"}</p>
          <h1>Manage</h1>
          <p>Organize your team, send access, assign training, and see who is ready.</p>
        </div>
      </header>

      <nav className="manage-tabs" aria-label="Manager tools">
        <NavLink to="/manage/team">Team & assignments</NavLink>
        <NavLink to="/manage/invites">Invites</NavLink>
        <NavLink to="/manage/readiness">Readiness</NavLink>
      </nav>

      <div className="manage-tab-content"><Outlet /></div>
    </section>
  );
}
