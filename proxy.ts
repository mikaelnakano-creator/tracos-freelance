import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/admin", "/freelancer", "/selecionar-area"];
type Role = "admin" | "freelancer";

export async function proxy(request: NextRequest) {
  const shouldProtect = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!shouldProtect) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const demoAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.TRACOS_ENABLE_DEMO === "true" ||
    process.env.NEXT_PUBLIC_TRACOS_ENABLE_DEMO === "true";

  if (!supabaseUrl || !supabaseKey) {
    if (!demoAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/configuracao-pendente";
      return NextResponse.redirect(url);
    }

    const response = NextResponse.next();
    response.headers.set("x-tracos-demo-mode", "true");
    return response;
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, is_active, organization_members(is_active, organization_member_roles(role))",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      id: string;
      is_active: boolean;
      organization_members:
        | Array<{
            is_active: boolean;
            organization_member_roles: Array<{ role: Role }>;
          }>
        | {
            is_active: boolean;
            organization_member_roles: Array<{ role: Role }>;
          }
        | null;
    }>();

  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/acesso-negado";
    return NextResponse.redirect(url);
  }

  const memberships = Array.isArray(profile.organization_members)
    ? profile.organization_members
    : profile.organization_members
      ? [profile.organization_members]
      : [];
  const activeMemberships = memberships.filter((member) => member.is_active);
  const roles = new Set<Role>(
    activeMemberships.flatMap((member) =>
      member.organization_member_roles.map((roleRow) => roleRow.role),
    ),
  );

  if (!profile.is_active || activeMemberships.length === 0) {
    const url = request.nextUrl.clone();
    url.pathname = "/conta-inativa";
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith("/admin") && !roles.has("admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/freelancer";
    return NextResponse.redirect(url);
  }

  if (
    request.nextUrl.pathname.startsWith("/freelancer") &&
    !roles.has("freelancer")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/freelancer",
    "/freelancer/:path*",
    "/selecionar-area",
  ],
};
