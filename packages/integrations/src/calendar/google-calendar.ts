import type { FreeBusyResult } from "../types";

/**
 * Real Google Calendar freebusy.query call — capacity feed only
 * (M11-T04). Deliberately returns busy windows and nothing else: no
 * function in this file writes to Task/Deliverable/Project. "Calendário
 * influencia capacidade, não promove progresso" (plan §4) is enforced
 * by this module having no domain-write dependency at all, not by a
 * runtime check.
 */
export const getGoogleCalendarFreeBusy = async (
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId = "primary"
): Promise<FreeBusyResult> => {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Google Calendar freeBusy failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    calendars?: Record<
      string,
      { busy?: ReadonlyArray<{ start: string; end: string }> }
    >;
  };
  const busy = body.calendars?.[calendarId]?.busy ?? [];
  return {
    provider: "GOOGLE_CALENDAR",
    busy: busy.map((w) => ({ start: w.start, end: w.end })),
  };
};
