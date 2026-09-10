import { Knock } from "@knocklabs/node";
import { keys } from "./keys";

const key = keys().KNOCK_SECRET_API_KEY;

export const notifications = new Knock({ apiKey: key });

export class PushChannelNotConfiguredError extends Error {
  constructor() {
    super("KNOCK_PUSH_CHANNEL_ID is not configured.");
    this.name = "PushChannelNotConfiguredError";
  }
}

/**
 * Registers a device's Expo push token against Knock's push channel
 * for one user (M08-T03 — "Expo Notifications → @repo/notifications/
 * Knock"). Real Knock API call (client.users.setChannelData), the same
 * mechanism this repo already uses for the web in-app feed, just a
 * different channel. `setChannelData` replaces the whole token list
 * for the channel — a user with multiple devices needs the caller to
 * read the existing list first if it wants to preserve other devices'
 * tokens; not done here since this repo has no multi-device tracking
 * yet (disclosed simplification, same shape as M11's other honestly-
 * scoped gaps).
 */
export const registerPushToken = async (
  userId: string,
  expoPushToken: string
): Promise<void> => {
  const channelId = keys().KNOCK_PUSH_CHANNEL_ID;
  if (!channelId) {
    throw new PushChannelNotConfiguredError();
  }
  await notifications.users.setChannelData(userId, channelId, {
    data: { tokens: [expoPushToken] },
  });
};
