/**
 * Central, lazy environment access.
 *
 * Values are read on demand (never at module import) so `next build` can run
 * without a populated `.env`. Nothing here ever exposes a secret to the client —
 * this module must only be imported from server code.
 */

const isProd = process.env.NODE_ENV === "production";

export const DEV_FALLBACK_AUTH_SECRET =
  "vale-logistics-dev-secret-do-not-use-in-production-0000";

export function getMongoUri(): string {
  const uri = process.env.MONGO_URI?.trim();
  if (uri) return uri;
  if (isProd) {
    throw new Error(
      "MONGO_URI is required in production. Set it in your environment before starting the server.",
    );
  }
  return "mongodb://127.0.0.1:27017/vale";
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (isProd) {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return DEV_FALLBACK_AUTH_SECRET;
}

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000"
  );
}

export type IntegrationState = {
  configured: boolean;
  /** Human readable reason shown in Settings → Integrations when not configured. */
  reason: string;
};

export function stripeConfig(): IntegrationState {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (key && webhook) {
    return { configured: true, reason: "Stripe secret key and webhook secret are set." };
  }
  return {
    configured: false,
    reason:
      "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable online payment collection. Offline invoice + payment recording works without it.",
  };
}

export function mapConfig(): IntegrationState {
  const provider = process.env.MAP_PROVIDER?.trim();
  const key = process.env.MAP_API_KEY?.trim();
  if (provider && key) {
    return { configured: true, reason: `Mapping provider "${provider}" is configured.` };
  }
  return {
    configured: false,
    reason:
      "No mapping/geocoding provider configured (MAP_PROVIDER / MAP_API_KEY). The system renders hub-sequence route timelines instead of a live map and never fabricates GPS positions.",
  };
}

export function oauthConfig(): {
  google: boolean;
  github: boolean;
  reason: string;
} {
  const google = Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
  const github = Boolean(
    process.env.AUTH_GITHUB_ID?.trim() && process.env.AUTH_GITHUB_SECRET?.trim(),
  );
  const missing: string[] = [];
  if (!google) missing.push("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET");
  if (!github) missing.push("AUTH_GITHUB_ID / AUTH_GITHUB_SECRET");
  return {
    google,
    github,
    reason: google && github
      ? "Google and GitHub OAuth are configured."
      : `Not configured: ${missing.join(", ")}. Credentials sign-in is unaffected.`,
  };
}

/** Never call with data that contains credentials or tokens. */
export function envSummary() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    mongoUriConfigured: Boolean(process.env.MONGO_URI?.trim()),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET?.trim()),
    baseUrl: getBaseUrl(),
    stripe: stripeConfig(),
    map: mapConfig(),
    oauth: oauthConfig(),
  };
}
