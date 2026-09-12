import { createHmac, timingSafeEqual } from "node:crypto";
import { keys } from "../keys";

/**
 * CSRF-protection for the Gmail/Outlook OAuth `state` parameter, without
 * a session store: `state = base64url(workspaceId).hmac(workspaceId)`.
 * The signing secret is INTEGRATIONS_ENCRYPTION_KEY, reused rather than
 * a dedicated OAUTH_STATE_SECRET — a disclosed simplification (one
 * fewer required secret for this milestone), not a cryptographic
 * concern: HMAC-signing and AES-encrypting the same key material with
 * two different, non-interacting primitives is a standard, safe reuse
 * as long as neither operation's output ever needs to be kept secret
 * from someone who can already compute the other (true here — both
 * only need to resist an attacker who lacks the key entirely).
 */
export class StateSigningKeyMissingError extends Error {
  constructor() {
    super("INTEGRATIONS_ENCRYPTION_KEY is not set — cannot sign OAuth state.");
    this.name = "StateSigningKeyMissingError";
  }
}

const resolveSecret = (): string => {
  const raw = keys().INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) {
    throw new StateSigningKeyMissingError();
  }
  return raw;
};

const sign = (workspaceId: string, secret: string): string =>
  createHmac("sha256", secret).update(workspaceId).digest("base64url");

export const signOAuthState = (workspaceId: string): string => {
  const secret = resolveSecret();
  const encodedWorkspaceId = Buffer.from(workspaceId, "utf8").toString(
    "base64url"
  );
  return `${encodedWorkspaceId}.${sign(workspaceId, secret)}`;
};

/** Returns the workspaceId if `state` verifies, otherwise null. */
export const verifyOAuthState = (state: string): string | null => {
  const secret = resolveSecret();
  const [encodedWorkspaceId, providedSignature] = state.split(".");
  if (!(encodedWorkspaceId && providedSignature)) {
    return null;
  }
  const workspaceId = Buffer.from(encodedWorkspaceId, "base64url").toString(
    "utf8"
  );
  const expectedSignature = sign(workspaceId, secret);

  const providedBuffer = Buffer.from(providedSignature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer) ? workspaceId : null;
};
