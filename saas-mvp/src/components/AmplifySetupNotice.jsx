import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";

export default function AmplifySetupNotice() {
  const amplifySetup = useAmplifySetup();

  if (amplifySetup.status !== "missing") {
    return null;
  }

  return (
    <div className="setup-notice" role="status">
      <strong>Line Up is temporarily unavailable.</strong>
      <p>
        Please try again shortly. Your saved restaurant information has not been changed.
      </p>
    </div>
  );
}
