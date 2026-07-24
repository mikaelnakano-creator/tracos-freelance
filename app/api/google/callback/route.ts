import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptGoogleToken } from "@/lib/google/crypto";
import { exchangeGoogleCode } from "@/lib/google/oauth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;

    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.json(
        { error: "Estado OAuth inválido. Tente conectar novamente." },
        { status: 400 },
      );
    }

    const token = await exchangeGoogleCode(code);
    const encryptedRefreshToken = token.refresh_token
      ? encryptGoogleToken(token.refresh_token)
      : null;

    cookieStore.delete("google_oauth_state");

    return NextResponse.redirect(
      new URL(
        `/admin/configuracoes/integracoes?google=connected&token=${encryptedRefreshToken ? "stored" : "missing-refresh-token"}`,
        request.url,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro no callback do Google.",
      },
      { status: 500 },
    );
  }
}
