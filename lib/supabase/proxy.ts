import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOptionalEnv, isDemoModeAllowed } from "@/lib/env";

const protectedPrefixes = ["/admin", "/freelancer", "/selecionar-area"];

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next({ request });
  setNoStore(response);

  if (isPrefetchRequest(request)) {
    return response;
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getOptionalEnv();

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    if (isDemoModeAllowed()) {
      response.headers.set("x-tracos-demo-mode", "true");
      return response;
    }

    if (isProtectedRoute(pathname) || pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/configuracao-pendente";
      return redirectWithCookies(url, response);
    }

    return response;
  }

  let supabaseResponse = response;

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });
          setNoStore(supabaseResponse);

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  const hasSession =
    !error &&
    typeof data?.claims?.sub === "string" &&
    data.claims.sub.length > 0;

  if (isProtectedRoute(pathname) && !hasSession) {
    logProxyAuthDecision("missing_session", request, {
      hasAuthCookie: String(hasSupabaseAuthCookie(request)),
      authCookieCount: String(countSupabaseAuthCookies(request)),
      hasClaims: "false",
    });

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", pathname);

    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export function redirectWithCookies(url: URL, sourceResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  setNoStore(redirectResponse);

  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export function isProtectedRoute(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function setNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
}

function isPrefetchRequest(request: NextRequest) {
  return (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  );
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return countSupabaseAuthCookies(request) > 0;
}

function countSupabaseAuthCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
    .length;
}

function logProxyAuthDecision(
  code: string,
  request: NextRequest,
  context: Record<string, string> = {},
) {
  console.warn("[tracos-auth-proxy]", {
    code,
    pathname: request.nextUrl.pathname,
    hostname: request.nextUrl.hostname,
    ...context,
  });
}
