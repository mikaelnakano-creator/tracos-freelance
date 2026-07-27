import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  FIRST_ADMIN_EMAIL: z.string().email().optional(),
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().optional(),
  TRACOS_ENABLE_DEMO: z.string().optional(),
  NEXT_PUBLIC_TRACOS_ENABLE_DEMO: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const requiredRuntimeEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FIRST_ADMIN_EMAIL",
] as const satisfies ReadonlyArray<keyof AppEnv>;

export function getOptionalEnv(): AppEnv {
  return envSchema.parse(process.env);
}

export function getMissingRuntimeEnv() {
  const env = getOptionalEnv();
  return requiredRuntimeEnvKeys.filter((key) => !env[key]);
}

export function hasSupabasePublicEnv() {
  const env = getOptionalEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function hasSupabaseServerEnv() {
  const env = getOptionalEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isDemoModeAllowed() {
  const env = getOptionalEnv();
  return (
    process.env.NODE_ENV !== "production" ||
    env.TRACOS_ENABLE_DEMO === "true" ||
    env.NEXT_PUBLIC_TRACOS_ENABLE_DEMO === "true"
  );
}

export function shouldShowPendingConfiguration() {
  return !hasSupabaseServerEnv() && !isDemoModeAllowed();
}

export function requireEnv(keys: Array<keyof AppEnv>) {
  const env = getOptionalEnv();
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Configuração ausente: ${missing.join(", ")}. Confira o .env.local e as variáveis da Vercel.`,
    );
  }

  return env as AppEnv & Record<(typeof keys)[number], string>;
}
