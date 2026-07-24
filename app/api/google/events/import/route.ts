import { NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  googleCalendarId: z.string().min(1),
  googleEventId: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = importSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Dados inválidos para importação do Google Agenda." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Evento validado para importação. Em produção, a constraint única evita duplicidade.",
    data: payload.data,
  });
}
