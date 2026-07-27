import { randomBytes } from "node:crypto";
import { getOptionalEnv, requireEnv } from "@/lib/env";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export function createGoogleOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function buildGoogleAuthorizationUrl(state: string) {
  const env = requireEnv(["GOOGLE_CALENDAR_CLIENT_ID"]);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", env.GOOGLE_CALENDAR_CLIENT_ID);
  url.searchParams.set("redirect_uri", getGoogleCalendarRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeGoogleCode(code: string) {
  const env = requireEnv([
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
  ]);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirect_uri: getGoogleCalendarRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível concluir a autorização com o Google.");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

function getGoogleCalendarRedirectUri() {
  const env = getOptionalEnv();
  const redirectUri = env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!redirectUri) {
    throw new Error(
      "Configuração ausente: GOOGLE_CALENDAR_REDIRECT_URI. Confira o .env.local.",
    );
  }

  return redirectUri;
}
