import { NextResponse, type NextRequest } from "next/server";
import { getOptionalEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const env = getOptionalEnv();
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.redirect(new URL("/acesso-negado", origin));
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", safeNextPath(next));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      scopes: "openid email profile",
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?erro=google", origin));
  }

  return NextResponse.redirect(data.url);
}

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
