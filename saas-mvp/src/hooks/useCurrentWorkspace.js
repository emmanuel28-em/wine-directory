import { useCallback, useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { activeMemberRoles, adminManagerRoles, isAdminOrManager } from "../lib/permissions.js";
import { loadPublicWorkspace } from "../lib/workspace.js";

export { activeMemberRoles };
export const managerRoles = adminManagerRoles;

export function isManagerRole(role) {
  return isAdminOrManager(role);
}

export function formatRole(role) {
  if (["owner", "admin", "manager"].includes(role)) {
    return "Manager";
  }

  if (role === "staff") {
    return "Staff";
  }

  return "No Role";
}

export function useCurrentWorkspace() {
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();
  const [workspace, setWorkspace] = useState({
    status: "loading",
    restaurant: null,
    userProfile: null,
    membership: null,
    message: ""
  });

  const reloadWorkspace = useCallback(async () => {
    if (amplifySetup.status !== "ready" || authSession.status !== "authenticated") {
      return null;
    }

    setWorkspace((current) => ({
      ...current,
      status: "loading",
      message: ""
    }));

    try {
      const nextWorkspace = await loadPublicWorkspace();
      setWorkspace(nextWorkspace);
      return nextWorkspace;
    } catch (error) {
      const errorWorkspace = {
        status: "error",
        restaurant: null,
        userProfile: null,
        membership: null,
        message: error.message || "No restaurant workspace found for this account."
      };
      setWorkspace(errorWorkspace);
      return errorWorkspace;
    }
  }, [amplifySetup.status, authSession.status, authSession.user]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      if (amplifySetup.status !== "ready" || authSession.status !== "authenticated") {
        if (isMounted) {
          setWorkspace({
            status: authSession.status === "authenticated" ? "loading" : "offline",
            restaurant: null,
            userProfile: null,
            membership: null,
            message: ""
          });
        }
        return;
      }

      const nextWorkspace = await reloadWorkspace();
      if (!isMounted || !nextWorkspace) {
        return;
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [amplifySetup.status, authSession.status, reloadWorkspace]);

  return useMemo(
    () => ({
      user: authSession.user,
      restaurant: workspace.restaurant,
      userProfile: workspace.userProfile,
      membership: workspace.membership,
      role: workspace.membership?.role || "",
      status: workspace.status,
      isLoading: amplifySetup.status === "loading" || authSession.status === "checking" || workspace.status === "loading",
      isAuthenticated: authSession.status === "authenticated",
      isActiveMember: workspace.status === "ready" && workspace.membership?.status === "active",
      isManager: isManagerRole(workspace.membership?.role),
      message: workspace.message,
      reloadWorkspace
    }),
    [amplifySetup.status, authSession.status, authSession.user, workspace, reloadWorkspace]
  );
}
