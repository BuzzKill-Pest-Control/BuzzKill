import { businessEnvironment } from "../deployment-environment";

/** Google is opt-in per backend environment so existing deployments need no secrets. */
export function googleSignInSettings(env: Record<string, string | undefined>) {
  if (
    env.BUZZKILL_MIGRATION_PREVIEW === "true" ||
    env.GOOGLE_SIGN_IN_ENABLED !== "true"
  ) return null;

  // A retained destination backend keeps its physical branch name when it
  // becomes production. Resolve the validated business environment first.
  const businessMode = businessEnvironment(env);
  const destination = env.AWS_APP_ID === "d3owdoeg1om341";
  let urls: string[];
  if (env.GOOGLE_AUTH_REDIRECT_URLS !== undefined) {
    urls = env.GOOGLE_AUTH_REDIRECT_URLS.split(",").map((value) => value.trim());
  } else {
    if (env.CRM_APP_URL !== undefined) {
      urls = [env.CRM_APP_URL];
    } else if (businessMode === "main") {
      urls = ["https://app.pestbuzzkill.com/"];
      if (!destination) urls.push("https://main.d5ln2hbbp9s2j.amplifyapp.com/");
    } else if (destination && businessMode === "staging") {
      urls = ["https://migration-staging.d2y2zigtl5rx3.amplifyapp.com/"];
    } else if (destination) {
      throw new Error("Destination Google sign-in requires CRM_APP_URL or explicit GOOGLE_AUTH_REDIRECT_URLS.");
    } else {
      urls = ["https://staging.d5ln2hbbp9s2j.amplifyapp.com/"];
    }
    if (businessMode !== "main") urls.push("http://localhost:5174/");
  }

  const redirectUrls = [...new Set(urls.map((value) => {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      !(url.protocol === "https:" || (url.protocol === "http:" && local)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/"
    ) {
      throw new Error("GOOGLE_AUTH_REDIRECT_URLS must contain HTTPS app origins (HTTP is allowed for localhost), each ending in /.");
    }
    return url.href;
  }))];

  return { redirectUrls };
}
