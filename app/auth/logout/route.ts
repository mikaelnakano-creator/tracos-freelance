import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Sem Supabase configurado, o modo demonstração apenas volta ao login.
  }

  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}
