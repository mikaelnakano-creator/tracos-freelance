import { NextResponse, type NextRequest } from "next/server";
import { getAccessByAuthUserId } from "@/lib/auth/access";
import { createServiceRoleClientForAuth } from "@/lib/auth/access";
import { setNoStore } from "@/lib/supabase/proxy";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const cookieResponse = NextResponse.next({ request });
  const supabase = createSupabaseRouteClient(request, cookieResponse);
  const authCookieCount = countSupabaseAuthCookies(request);

  const { data, error } = await supabase.auth.getClaims();
  const authUserId =
    typeof data?.claims?.sub === "string" && data.claims.sub.length > 0
      ? data.claims.sub
      : null;

  let profileFound = false;
  let hasAdminRole = false;
  let hasFreelancerRole = false;

  if (authUserId) {
    try {
      const access = await getAccessByAuthUserId(
        createServiceRoleClientForAuth(),
        authUserId,
      );

      profileFound = access.status === "authorized";
      hasAdminRole =
        access.status === "authorized" && access.roles.includes("admin");
      hasFreelancerRole =
        access.status === "authorized" && access.roles.includes("freelancer");
    } catch {
      profileFound = false;
    }
  }

  const response = NextResponse.json({
    hostname: request.nextUrl.hostname,
    hasAuthCookie: authCookieCount > 0,
    authCookieCount,
    hasClaims: !error && Boolean(data?.claims),
    hasAuthUserId: Boolean(authUserId),
    profileFound,
    hasAdminRole,
    hasFreelancerRole,
  });

  setNoStore(response);
  cookieResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function countSupabaseAuthCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
    .length;
}
