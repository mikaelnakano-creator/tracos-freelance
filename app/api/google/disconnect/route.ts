import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message:
      "Conexão removida. Em produção, apague google_connections e registre audit_logs.",
  });
}
