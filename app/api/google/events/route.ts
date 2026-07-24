import { NextResponse } from "next/server";
import { demoGoogleEvents } from "@/lib/demo/seed-data";

export async function GET() {
  return NextResponse.json({
    events: demoGoogleEvents,
    range: {
      defaultPastDays: 30,
      defaultFutureDays: 180,
    },
  });
}
