import type { FreeBusyResult } from "../types";

/**
 * Real Microsoft Graph getSchedule call — capacity feed only (M11-T04),
 * same non-mutating contract as google-calendar.ts. getSchedule returns
 * per-slot availability strings ("busy"/"free"/"tentative"/...); only
 * "busy" and "tentative" become FreeBusyWindow entries — "free"/
 * "workingElsewhere" are not capacity blockers.
 */
export const getOutlookCalendarFreeBusy = async (
  accessToken: string,
  timeMin: string,
  timeMax: string,
  scheduleEmail: string
): Promise<FreeBusyResult> => {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedules: [scheduleEmail],
        startTime: { dateTime: timeMin, timeZone: "UTC" },
        endTime: { dateTime: timeMax, timeZone: "UTC" },
        availabilityViewInterval: 30,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Graph getSchedule failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    value?: ReadonlyArray<{
      scheduleItems?: ReadonlyArray<{
        status: string;
        start: { dateTime: string };
        end: { dateTime: string };
      }>;
    }>;
  };
  const items = body.value?.[0]?.scheduleItems ?? [];
  const busy = items
    .filter((item) => item.status === "busy" || item.status === "tentative")
    .map((item) => ({ start: item.start.dateTime, end: item.end.dateTime }));
  return { provider: "OUTLOOK_CALENDAR", busy };
};
