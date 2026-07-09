import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";

const AmplifySetupContext = createContext(null);

export function AmplifySetupProvider({ children }) {
  const [setupState, setSetupState] = useState({
    status: "loading",
    message: "Checking Amplify configuration..."
  });

  useEffect(() => {
    let isMounted = true;

    async function configureAmplify() {
      try {
        // Amplify Gen 2 creates this file after you run `npx ampx sandbox`.
        // Fetching it at runtime lets the app build before the backend exists.
        const response = await fetch("/amplify_outputs.json", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Amplify outputs file was not found.");
        }

        const outputs = await response.json();
        Amplify.configure(outputs);

        if (isMounted) {
          setSetupState({
            status: "ready",
            message: "Amplify is configured."
          });
        }
      } catch {
        if (isMounted) {
          setSetupState({
            status: "missing",
            message: "Amplify is not connected yet. Run the cloud sandbox to create amplify_outputs.json."
          });
        }
      }
    }

    configureAmplify();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(() => setupState, [setupState]);

  return (
    <AmplifySetupContext.Provider value={value}>
      {children}
    </AmplifySetupContext.Provider>
  );
}

export function useAmplifySetup() {
  return useContext(AmplifySetupContext);
}
