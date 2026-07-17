import { Link } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";

export default function AmplifySetupNotice() {
  const amplifySetup = useAmplifySetup();

  if (amplifySetup.status !== "missing") {
    return null;
  }

  return (
    <div className="setup-notice" role="status">
      <strong>Line Up is not connected to its cloud workspace yet.</strong>
      <p>
        Start the local cloud sandbox before testing real signup, login, and saved training content.
      </p>
      <Link to="/login">Go to login</Link>
    </div>
  );
}
