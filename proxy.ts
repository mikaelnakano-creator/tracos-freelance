import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/admin", "/freelancer"];
type Role = "admin" | "freelancer";

export async function proxy(request: NextRequest) {
  const shouldProtect = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!shouldProtect) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
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
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<{ role: Role; is_active: boolean }>();

  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/acesso-negado";
    return NextResponse.redirect(url);
  }

  if (!profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = "/conta-inativa";
    return NextResponse.redirect(url);
  }

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    profile.role !== "admin"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/freelancer";
    return NextResponse.redirect(url);
  }

  if (
    request.nextUrl.pathname.startsWith("/freelancer") &&
    profile.role !== "freelancer"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/freelancer", "/freelancer/:path*"],
};
