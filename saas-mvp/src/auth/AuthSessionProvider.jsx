import { fetchAuthSession, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";

const AuthSessionContext = createContext(null);

function readPlatformRole(payload = {}) {
  const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
  if (groups.includes("lineup-platform-owners")) return "platform_owner";
  if (groups.includes("lineup-platform-developers")) return "platform_developer";
  return "";
}

export function AuthSessionProvider({ children }) {
  const amplifySetup = useAmplifySetup();
  const [session, setSession] = useState({
    status: "checking",
    user: null,
    platformRole: ""
  });

  async function refreshSession() {
    if (amplifySetup.status !== "ready") {
      setSession({
        status: amplifySetup.status === "missing" ? "missing-config" : "checking",
        user: null,
        platformRole: ""
      });
      return;
    }

    try {
      // This asks Cognito directly whether there is a real signed-in user.
      const [user, authTokens] = await Promise.all([getCurrentUser(), fetchAuthSession()]);
      const platformRole = readPlatformRole(authTokens.tokens?.accessToken?.payload);
      setSession({ status: "authenticated", user, platformRole });
    } catch {
      setSession({ status: "unauthenticated", user: null, platformRole: "" });
    }
  }

  async function signOut() {
    await amplifySignOut();
    setSession({ status: "unauthenticated", user: null, platformRole: "" });
  }

  useEffect(() => {
    refreshSession();

    if (amplifySetup.status !== "ready") {
      return undefined;
    }

    // Amplify announces auth events here after signup, login, and logout.
    // Listening keeps the app shell, redirects, and protected routes in sync.
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (["signedIn", "signedOut", "tokenRefresh"].includes(payload.event)) {
        refreshSession();
      }
    });

    return unsubscribe;
  }, [amplifySetup.status]);

  const value = useMemo(
    () => ({
      ...session,
      refreshSession,
      signOut
    }),
    [session]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
