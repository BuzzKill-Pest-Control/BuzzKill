import { Hub } from "aws-amplify/utils";

let error: string | null = null;
const listeners = new Set<() => void>();

// Register before Amplify.configure: redirect completion can fail before React
// mounts. Remember that result so the returned login screen can explain it.
Hub.listen("auth", ({ payload }) => {
  if (payload.event === "signInWithRedirect_failure") {
    error =
      "Google sign-in wasn't completed. Try again with the Google account that uses your BuzzKill account email, or use your password or an emailed sign-in link.";
  } else if (payload.event === "signedIn" || payload.event === "signedOut") {
    error = null;
  } else {
    return;
  }
  listeners.forEach((listener) => listener());
});

export function getGoogleSignInError(): string | null {
  return error;
}

export function subscribeGoogleSignInError(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
