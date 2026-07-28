import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeGoogleUser,
  createServiceRoleClientForAuth,
  dashboardPathForRoles,
} from "@/lib/auth/access";
import { redirectWithCookies } from "@/lib/supabase/proxy";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?erro=oauth_exchange_failed", origin),
    );
  }

  const cookieResponse = NextResponse.next({ request });
  const supabase = createSupabaseRouteClient(request, cookieResponse);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logCallbackIssue("oauth_exchange_failed", request, { hasCode: true });
    return redirectWithCookies(
      new URL("/login?erro=oauth_exchange_failed", origin),
      cookieResponse,
    );
  }

  if (!hasSupabaseAuthCookie(cookieResponse)) {
    logCallbackIssue("session_cookie_failed", request, { hasCode: true });
    return redirectWithCookies(
      new URL("/login?erro=session_cookie_failed", origin),
      cookieResponse,
    );
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logCallbackIssue("oauth_exchange_failed", request, {
        hasSessionCookie: true,
      });
      return redirectWithCookies(
        new URL("/login?erro=oauth_exchange_failed", origin),
        cookieResponse,
      );
    }

    const adminClient = createServiceRoleClientForAuth();
    const access = await authorizeGoogleUser(user, adminClient);

    if (access.status === "inactive") {
      logCallbackIssue("inactive_user", request, { hasSessionCookie: true });
      return redirectWithCookies(
        new URL("/conta-inativa?erro=inactive_user", origin),
        cookieResponse,
      );
    }

    if (access.status !== "authorized") {
      logCallbackIssue("unauthorized_email", request, {
        hasSessionCookie: true,
      });
      return redirectWithCookies(
        new URL("/acesso-negado?erro=unauthorized_email", origin),
        cookieResponse,
      );
    }

    return redirectWithCookies(
      new URL(dashboardPathForRoles(access.roles), origin),
      cookieResponse,
    );
  } catch (error) {
    logCallbackIssue("bootstrap_failed", request, {
      hasSessionCookie: hasSupabaseAuthCookie(cookieResponse),
      errorName: error instanceof Error ? error.name : "unknown",
    });

    return redirectWithCookies(
      new URL("/acesso-negado?erro=bootstrap_failed", origin),
      cookieResponse,
    );
  }
}

function hasSupabaseAuthCookie(response: NextResponse) {
  return response.cookies
    .getAll()
    .some((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
}

function logCallbackIssue(
  code: string,
  request: NextRequest,
  context: Record<string, boolean | string> = {},
) {
  console.warn("[tracos-auth-callback]", {
    code,
    route: request.nextUrl.pathname,
    ...context,
  });
}
