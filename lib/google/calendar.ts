import type { GoogleCalendarEvent } from "@/lib/domain/types";

type GoogleEventItem = {
  id: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export async function listGoogleCalendars(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível listar agendas do Google.");
  }

  return response.json() as Promise<{
    items: Array<{ id: string; summary: string; primary?: boolean }>;
  }>;
}

export async function listGoogleEvents(input: {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
  query?: string;
}) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      input.calendarId,
    )}/events`,
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", input.timeMin);
  url.searchParams.set("timeMax", input.timeMax);
  if (input.query) url.searchParams.set("q", input.query);

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Não foi possível listar eventos do Google Agenda.");
  }

  const payload = (await response.json()) as { items?: GoogleEventItem[] };
  return (payload.items ?? []).map((item): GoogleCalendarEvent => {
    const allDay = Boolean(item.start?.date && !item.start?.dateTime);

    return {
      id: item.id,
      calendarId: input.calendarId,
      htmlLink: item.htmlLink ?? "",
      title: item.summary ?? "Evento sem título",
      description: item.description ?? "",
      location: item.location ?? "",
      startsAt: item.start?.dateTime ?? `${item.start?.date}T00:00:00`,
      endsAt: item.end?.dateTime ?? null,
      allDay,
    };
  });
}
