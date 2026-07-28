import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardPathForRoles } from "@/lib/auth/access";
import { getOptionalEnv, isDemoModeAllowed } from "@/lib/env";
import type { UserRole } from "@/lib/domain/types";

const protectedPrefixes = ["/admin", "/freelancer", "/selecionar-area"];
const authPages = ["/login"];

type ProxyRoleRow = {
  role: UserRole;
};

type ProxyMemberRow = {
  organization_id: string;
  is_active: boolean;
  organization_member_roles: ProxyRoleRow[] | ProxyRoleRow | null;
};

type ProxyProfileRow = {
  id: string;
  organization_id?: string | null;
  is_active: boolean;
  organization_members: ProxyMemberRow[] | ProxyMemberRow | null;
};

type ProxyAccessResult =
  | {
      status: "authorized";
      roles: UserRole[];
    }
  | {
      status: "unauthenticated" | "unauthorized" | "inactive" | "error";
      code?: string;
    };

export async function updateSession(request: NextRequest) {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getOptionalEnv();
  const pathname = request.nextUrl.pathname;
  const requiresAppAccess = isProtectedPath(pathname);
  const checksExistingSession = isAuthPage(pathname);

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const response = NextResponse.next({ request });

    if (isDemoModeAllowed()) {
      response.headers.set("x-tracos-demo-mode", "true");
      return response;
    }

    if (requiresAppAccess || checksExistingSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/configuracao-pendente";
      return redirectWithCookies(url, response);
    }

    return response;
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

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

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  const authUserId =
    typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!authUserId) {
    if (!requiresAppAccess) return supabaseResponse;

    logProxyAuthIssue("missing_session", request, {
      hasClaimsError: Boolean(error),
    });

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return redirectWithCookies(url, supabaseResponse);
  }

  if (!requiresAppAccess && !checksExistingSession) {
    return supabaseResponse;
  }

  const access = await getProxyAccess(supabase, authUserId, request);

  if (checksExistingSession) {
    return redirectByAccess(request, access, supabaseResponse);
  }

  if (access.status !== "authorized") {
    return redirectByAccess(request, access, supabaseResponse);
  }

  if (pathname.startsWith("/selecionar-area")) {
    const hasAdmin = access.roles.includes("admin");
    const hasFreelancer = access.roles.includes("freelancer");

    if (!hasAdmin || !hasFreelancer) {
      return redirectWithCookies(
        new URL(dashboardPathForRoles(access.roles), request.url),
        supabaseResponse,
      );
    }

    return supabaseResponse;
  }

  if (pathname.startsWith("/admin") && !access.roles.includes("admin")) {
    return redirectWithCookies(
      new URL(
        access.roles.includes("freelancer") ? "/freelancer" : "/acesso-negado",
        request.url,
      ),
      supabaseResponse,
    );
  }

  if (
    pathname.startsWith("/freelancer") &&
    !access.roles.includes("freelancer")
  ) {
    return redirectWithCookies(
      new URL(
        access.roles.includes("admin") ? "/admin/dashboard" : "/acesso-negado",
        request.url,
      ),
      supabaseResponse,
    );
  }

  return supabaseResponse;
}

export function redirectWithCookies(url: URL, sourceResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

async function getProxyAccess(
  supabase: ReturnType<typeof createServerClient>,
  authUserId: string,
  request: NextRequest,
): Promise<ProxyAccessResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, organization_id, is_active, organization_members(organization_id, is_active, organization_member_roles(role))",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    logProxyAuthIssue("profile_query_failed", request, {
      hasSession: true,
    });
    return { status: "error", code: "profile_query_failed" };
  }

  const profile = data as ProxyProfileRow | null;

  if (!profile) {
    logProxyAuthIssue("unauthorized_email", request, {
      hasSession: true,
    });
    return { status: "unauthorized", code: "unauthorized_email" };
  }

  const memberships = toArray(profile.organization_members);
  const activeMemberships = memberships.filter((member) => member.is_active);
  const roles = normalizeRoles(
    activeMemberships.flatMap((member) =>
      toArray(member.organization_member_roles).map((roleRow) => roleRow.role),
    ),
  );

  if (!profile.is_active || activeMemberships.length === 0) {
    return { status: "inactive", code: "inactive_user" };
  }

  if (roles.length === 0) {
    return { status: "unauthorized", code: "unauthorized_email" };
  }

  return { status: "authorized", roles };
}

function redirectByAccess(
  request: NextRequest,
  access: ProxyAccessResult,
  sourceResponse: NextResponse,
) {
  const url = request.nextUrl.clone();

  switch (access.status) {
    case "authorized":
      url.pathname = dashboardPathForRoles(access.roles);
      break;
    case "unauthenticated":
      url.pathname = "/login";
      break;
    case "inactive":
      url.pathname = "/conta-inativa";
      setSafeError(url, access.code);
      break;
    case "error":
      url.pathname = "/acesso-negado";
      setSafeError(url, access.code);
      break;
    case "unauthorized":
      url.pathname = "/acesso-negado";
      setSafeError(url, access.code);
      break;
  }

  return redirectWithCookies(url, sourceResponse);
}

function setSafeError(url: URL, code?: string) {
  if (code) url.searchParams.set("erro", code);
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAuthPage(pathname: string) {
  return authPages.includes(pathname);
}

function normalizeRoles(roles: UserRole[]) {
  return Array.from(new Set(roles)).filter((role): role is UserRole =>
    ["admin", "freelancer"].includes(role),
  );
}

function toArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function logProxyAuthIssue(
  code: string,
  request: NextRequest,
  context: Record<string, boolean | string> = {},
) {
  console.warn("[tracos-auth-proxy]", {
    code,
    route: request.nextUrl.pathname,
    ...context,
  });
}
