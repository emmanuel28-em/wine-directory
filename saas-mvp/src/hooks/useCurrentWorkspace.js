import { useCallback, useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { isWorkspaceBillingPaused } from "../lib/billing.js";
import { activeMemberRoles, adminManagerRoles, isAdminOrManager } from "../lib/permissions.js";
import { loadUserWorkspace } from "../lib/workspace.js";

export { activeMemberRoles };
export const managerRoles = adminManagerRoles;

export function isManagerRole(role) {
  return isAdminOrManager(role);
}

export function formatRole(role) {
  if (role === "owner") {
    return "Account Owner";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "manager") {
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
      const nextWorkspace = await loadUserWorkspace(authSession.user);
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
            status: authSession.status === "authenticated" ? "loading" : "signedOut",
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
  }, [amplifySetup.status, authSession.status, authSession.user?.userId, reloadWorkspace]);

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
      isBillingPaused: workspace.status === "ready" && isWorkspaceBillingPaused(workspace.restaurant),
      isManager: isManagerRole(workspace.membership?.role),
      message: workspace.message,
      reloadWorkspace
    }),
    [amplifySetup.status, authSession.status, authSession.user, workspace, reloadWorkspace]
  );
}
