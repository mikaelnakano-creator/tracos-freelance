import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    calendars: [
      { id: "primary", summary: "Traços Detalhados - Eventos", primary: true },
      { id: "production", summary: "Produção Fotográfica" },
    ],
    note: "A rota real usa o access token descriptografado e Google Calendar API.",
  });
}
