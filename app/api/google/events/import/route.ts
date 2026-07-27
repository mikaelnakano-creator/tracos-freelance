import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoModeAllowed } from "@/lib/env";

const importSchema = z.object({
  googleCalendarId: z.string().min(1),
  googleEventId: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isDemoModeAllowed()) {
    return NextResponse.json(
      {
        error:
          "Importação real depende da conexão do Google Agenda e do Supabase configurado.",
      },
      { status: 503 },
    );
  }

  const payload = importSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Dados inválidos para importação do Google Agenda." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Evento validado no modo demonstração.",
    data: payload.data,
  });
}
