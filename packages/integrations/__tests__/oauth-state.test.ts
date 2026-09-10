import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  StateSigningKeyMissingError,
  signOAuthState,
  verifyOAuthState,
} from "../src/oauth-state";

describe("signOAuthState / verifyOAuthState", () => {
  const originalKey = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY =
      randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (originalKey === undefined) {
      // biome-ignore lint/performance/noDelete: assignment can't restore "unset".
      delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    } else {
      process.env.INTEGRATIONS_ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips a workspaceId through sign/verify", () => {
    const state = signOAuthState("workspace-123");
    expect(verifyOAuthState(state)).toBe("workspace-123");
  });

  it("rejects a tampered state", () => {
    const state = signOAuthState("workspace-123");
    // Tamper the second-to-last character, not the last one: the final
    // character of a base64url-encoded SHA-256 digest (oauth-state.ts's
    // `sign()`) carries 2 padding bits that Buffer's base64url decoder
    // ignores — flipping only that character can decode to the exact
    // same signature bytes, occasionally making this assertion falsely
    // pass depending on the random key `beforeEach` generates (caught
    // by a real CI run, not a flake — every character before the final
    // one sits in a full, unpadded base64 group, so tampering there is
    // guaranteed to change the decoded bytes).
    const index = state.length - 2;
    const tamperedChar = state[index] === "A" ? "B" : "A";
    const tampered =
      state.slice(0, index) + tamperedChar + state.slice(index + 1);
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a state with a different workspaceId spliced in", () => {
    const stateA = signOAuthState("workspace-a");
    const [, signatureA] = stateA.split(".");
    const encodedB = Buffer.from("workspace-b", "utf8").toString("base64url");
    expect(verifyOAuthState(`${encodedB}.${signatureA}`)).toBeNull();
  });

  it("rejects a malformed state without throwing", () => {
    expect(() => verifyOAuthState("not-a-valid-state")).not.toThrow();
    expect(verifyOAuthState("not-a-valid-state")).toBeNull();
  });

  it("throws StateSigningKeyMissingError rather than signing without a key", () => {
    // biome-ignore lint/performance/noDelete: assignment can't restore "unset".
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
    expect(() => signOAuthState("workspace-123")).toThrow(
      StateSigningKeyMissingError
    );
  });
});
