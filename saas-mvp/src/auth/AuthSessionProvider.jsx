import { getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const amplifySetup = useAmplifySetup();
  const [session, setSession] = useState({
    status: "checking",
    user: null
  });

  async function refreshSession() {
    if (amplifySetup.status !== "ready") {
      setSession({
        status: amplifySetup.status === "missing" ? "missing-config" : "checking",
        user: null
      });
      return;
    }

    try {
      // This asks Cognito directly whether there is a real signed-in user.
      const user = await getCurrentUser();
      setSession({ status: "authenticated", user });
    } catch {
      setSession({ status: "unauthenticated", user: null });
    }
  }

  async function signOut() {
    await amplifySignOut();
    setSession({ status: "unauthenticated", user: null });
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
