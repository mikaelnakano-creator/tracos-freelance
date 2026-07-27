import { NextResponse } from "next/server";
import { isDemoModeAllowed } from "@/lib/env";

export async function GET() {
  if (!isDemoModeAllowed()) {
    return NextResponse.json(
      {
        error:
          "Google Agenda ainda precisa ser conectado por um administrador.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    calendars: [
      { id: "primary", summary: "Traços Detalhados - Eventos", primary: true },
      { id: "production", summary: "Produção Fotográfica" },
    ],
    note: "Dados disponíveis somente no modo demonstração.",
  });
}
