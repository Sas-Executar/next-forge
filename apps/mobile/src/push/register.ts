import Constants from "expo-constants";
import { isDevice } from "expo-device";
import {
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications";
import { env } from "@/env";

export class PushPermissionDeniedError extends Error {
  constructor() {
    super("Push notification permission was not granted.");
    this.name = "PushPermissionDeniedError";
  }
}

export class NotPhysicalDeviceError extends Error {
  constructor() {
    super(
      "Push notifications require a physical device (simulators have no push token)."
    );
    this.name = "NotPhysicalDeviceError";
  }
}

/**
 * Real Expo push token registration (M08-T03) — the standard
 * request-permission → getExpoPushTokenAsync flow
 * (docs.expo.dev/push-notifications/push-notifications-setup). Needs
 * app.json's `extra.eas.projectId` populated by a real `eas
 * init`/`eas project:init` run against an Expo account — left empty in
 * this repo (no such account exists in this sandbox), so this throws
 * honestly rather than requesting a token that would silently fail
 * server-side.
 */
export const getExpoPushToken = async (): Promise<string> => {
  if (!isDevice) {
    throw new NotPhysicalDeviceError();
  }

  const { status: existingStatus } = await getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new PushPermissionDeniedError();
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  if (!projectId) {
    throw new Error(
      "app.json's extra.eas.projectId is empty — run `eas init` against a real Expo account before requesting a push token."
    );
  }

  const { data } = await getExpoPushTokenAsync({ projectId });
  return data;
};

export class DeviceRegistrationFailedError extends Error {
  constructor(status: number, body: string) {
    super(`Device registration failed: HTTP ${status} ${body}`);
    this.name = "DeviceRegistrationFailedError";
  }
}

/**
 * Sends the Expo push token to apps/api's /notifications/register-device
 * route, which stores it as Knock push channel data for the signed-in
 * user (packages/notifications' registerPushToken — the same provider
 * this repo already uses for the web in-app feed). Requires
 * EXPO_PUBLIC_API_URL to be set (this repo doesn't default it to a
 * hardcoded host — there is no production apps/api URL to assume).
 */
export const registerDeviceForPush = async (
  expoPushToken: string,
  sessionToken: string
): Promise<void> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/notifications/register-device", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ expoPushToken }),
    }
  );
  if (!response.ok) {
    throw new DeviceRegistrationFailedError(
      response.status,
      await response.text()
    );
  }
};
