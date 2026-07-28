import { NextResponse, type NextRequest } from "next/server";
import { redirectWithCookies } from "@/lib/supabase/proxy";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const cookieResponse = NextResponse.next({ request });

  try {
    const supabase = createSupabaseRouteClient(request, cookieResponse);
    await supabase.auth.signOut();
  } catch {
    // Without Supabase configuration, demo mode just returns to login.
  }

  return redirectWithCookies(
    new URL("/login", request.nextUrl.origin),
    cookieResponse,
  );
}
