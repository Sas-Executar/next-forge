import { auth } from "@repo/auth/server";
import {
  PushChannelNotConfiguredError,
  registerPushToken,
} from "@repo/notifications";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(1),
});

/**
 * Registers an Expo push token for the signed-in user (M08-T03,
 * called by apps/mobile/src/push/register.ts). Auth comes from
 * apps/api's new Clerk middleware (proxy.ts) resolving the request's
 * `Authorization: Bearer <session token>` header — the real mechanism
 * clerkMiddleware() uses for native/mobile clients, distinct from the
 * cookie-based sessions every other route in this app has relied on
 * until now.
 */
export const POST = async (request: Request): Promise<Response> => {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = registerDeviceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", ok: false },
      { status: 400 }
    );
  }

  try {
    await registerPushToken(userId, parsed.data.expoPushToken);
  } catch (error) {
    if (error instanceof PushChannelNotConfiguredError) {
      return NextResponse.json({ message: "Not configured", ok: false });
    }
    log.error("Failed to register push token", { error });
    return NextResponse.json(
      { message: "something went wrong", ok: false },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
};
