import { NextResponse } from "next/server";
import { demoGoogleEvents } from "@/lib/demo/seed-data";
import { isDemoModeAllowed } from "@/lib/env";

export async function GET() {
  if (!isDemoModeAllowed()) {
    return NextResponse.json(
      {
        error:
          "Google Agenda ainda precisa ser configurado pela administração.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    events: demoGoogleEvents,
    range: {
      defaultPastDays: 30,
      defaultFutureDays: 180,
    },
  });
}
