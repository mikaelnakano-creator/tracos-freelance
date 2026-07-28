import { NextResponse, type NextRequest } from "next/server";
import { getOptionalEnv, shouldShowPendingConfiguration } from "@/lib/env";
import { redirectWithCookies } from "@/lib/supabase/proxy";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const env = getOptionalEnv();
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return redirectWithCookies(
      new URL(
        shouldShowPendingConfiguration()
          ? "/configuracao-pendente"
          : "/acesso-negado",
        origin,
      ),
      NextResponse.next({ request }),
    );
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", safeNextPath(next));

  const cookieResponse = NextResponse.next({ request });
  const supabase = createSupabaseRouteClient(request, cookieResponse);
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
    return redirectWithCookies(
      new URL("/login?erro=google", origin),
      cookieResponse,
    );
  }

  return redirectWithCookies(new URL(data.url), cookieResponse);
}

function safeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
