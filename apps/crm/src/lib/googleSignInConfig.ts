type OutputRecord = Record<string, unknown>;

function record(value: unknown): OutputRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as OutputRecord)
    : null;
}

function redirectForOrigin(value: unknown, origin: string): string | null {
  if (!Array.isArray(value)) return null;
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    try {
      const url = new URL(candidate);
      if (
        url.origin === origin &&
        !url.username &&
        !url.password &&
        !url.hash &&
        !url.search
      ) {
        return candidate;
      }
    } catch {
      // An invalid registered URL must not break password or magic-link login.
    }
  }
  return null;
}

/**
 * Keep OAuth on the host where the user started. Amplify's default URL picker
 * also matches hostname substrings, which can choose the wrong localhost port
 * or another environment. Only pass the current origin's registered URLs.
 */
export function configureGoogleSignIn(
  outputs: OutputRecord,
  origin: string,
  migrationPreview = false
): { outputs: OutputRecord; enabled: boolean } {
  const auth = record(outputs.auth);
  const oauth = record(auth?.oauth);
  if (!auth || !oauth) return { outputs, enabled: false };

  const signIn = redirectForOrigin(oauth.redirect_sign_in_uri, origin);
  const signOut = redirectForOrigin(oauth.redirect_sign_out_uri, origin);
  const enabled =
    !migrationPreview &&
    record(outputs.custom)?.migrationPreview !== true &&
    Array.isArray(oauth.identity_providers) &&
    oauth.identity_providers.includes("GOOGLE") &&
    typeof oauth.domain === "string" &&
    oauth.domain.length > 0 &&
    oauth.response_type === "code" &&
    Array.isArray(oauth.scopes) &&
    oauth.scopes.includes("openid") &&
    oauth.scopes.includes("email") &&
    !!signIn &&
    !!signOut;

  const { oauth: _oauth, ...nativeAuth } = auth;
  return {
    enabled,
    outputs: {
      ...outputs,
      auth: enabled
        ? {
            ...nativeAuth,
            oauth: {
              ...oauth,
              redirect_sign_in_uri: [signIn],
              redirect_sign_out_uri: [signOut],
            },
          }
        : nativeAuth,
    },
  };
}
