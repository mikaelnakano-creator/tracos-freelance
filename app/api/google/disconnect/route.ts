import { NextResponse } from "next/server";
import { isDemoModeAllowed } from "@/lib/env";

export async function POST() {
  if (!isDemoModeAllowed()) {
    return NextResponse.json(
      {
        error:
          "Desconexão real depende da conexão do Google Agenda e do Supabase configurado.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Conexão removida no modo demonstração.",
  });
}
