import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
} from "@/lib/google/oauth";

export async function GET() {
  try {
    const state = createGoogleOAuthState();
    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 600,
    });

    return NextResponse.redirect(buildGoogleAuthorizationUrl(state));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao iniciar OAuth.",
      },
      { status: 500 },
    );
  }
}
