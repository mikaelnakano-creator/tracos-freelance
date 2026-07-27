import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeGoogleUser,
  createServiceRoleClientForAuth,
  dashboardPathForRole,
} from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?erro=callback", origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) throw exchangeError;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw userError;

    const adminClient = createServiceRoleClientForAuth();
    const access = await authorizeGoogleUser(user, adminClient);

    if (access.status === "inactive") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/conta-inativa", origin));
    }

    if (access.status !== "authorized") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/acesso-negado", origin));
    }

    return NextResponse.redirect(
      new URL(dashboardPathForRole(access.role), origin),
    );
  } catch {
    return NextResponse.redirect(new URL("/acesso-negado", origin));
  }
}
