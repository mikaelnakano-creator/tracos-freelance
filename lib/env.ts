import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getOptionalEnv(): AppEnv {
  return envSchema.parse(process.env);
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
