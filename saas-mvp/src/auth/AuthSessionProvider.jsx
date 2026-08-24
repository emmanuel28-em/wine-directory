import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";

const AuthSessionContext = createContext(null);

const publicUser = {
  userId: "public-visitor",
  username: "public-visitor",
  signInDetails: {
    loginId: "public@lineup.local"
  }
};

export function AuthSessionProvider({ children }) {
  const amplifySetup = useAmplifySetup();
  const [session, setSession] = useState({
    status: "checking",
    user: publicUser,
    platformRole: ""
  });

  async function refreshSession() {
    setSession({
      status: amplifySetup.status === "loading" ? "checking" : "authenticated",
      user: publicUser,
      platformRole: ""
    });
  }

  async function signOut() {
    setSession({ status: "authenticated", user: publicUser, platformRole: "" });
  }

  useEffect(() => {
    refreshSession();
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
