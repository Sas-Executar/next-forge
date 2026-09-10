import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseWhatsAppWebhookPayload,
  verifyWhatsAppHandshake,
  verifyWhatsAppSignature,
} from "../src/whatsapp/webhook";

describe("verifyWhatsAppSignature", () => {
  const secret = "test-app-secret";
  const body = '{"entry":[]}';
  const validSignature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts a signature computed with the correct secret", () => {
    expect(verifyWhatsAppSignature(body, validSignature, secret)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const wrongSignature = `sha256=${createHmac("sha256", "wrong").update(body).digest("hex")}`;
    expect(verifyWhatsAppSignature(body, wrongSignature, secret)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyWhatsAppSignature(body, null, secret)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", () => {
    expect(verifyWhatsAppSignature(body, "abcdef", secret)).toBe(false);
  });

  it("rejects a truncated signature without throwing", () => {
    expect(verifyWhatsAppSignature(body, "sha256=abcd", secret)).toBe(false);
  });
});

describe("verifyWhatsAppHandshake", () => {
  it("returns the challenge when mode and token match", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "expected-token",
      "hub.challenge": "12345",
    });
    expect(verifyWhatsAppHandshake(params, "expected-token")).toBe("12345");
  });

  it("returns null when the verify token doesn't match", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "12345",
    });
    expect(verifyWhatsAppHandshake(params, "expected-token")).toBeNull();
  });
});

describe("parseWhatsAppWebhookPayload", () => {
  it("extracts phoneNumberId and normalized message events", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123456" },
                messages: [
                  {
                    id: "wamid.abc",
                    from: "5511999999999",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "oi" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = parseWhatsAppWebhookPayload(payload);
    expect(result.phoneNumberId).toBe("123456");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.externalId).toBe("wamid.abc");
    expect(result.events[0]?.externalObjectType).toBe("whatsapp_message");
  });

  it("returns an empty result for a malformed payload rather than throwing", () => {
    expect(() => parseWhatsAppWebhookPayload({})).not.toThrow();
    const result = parseWhatsAppWebhookPayload({});
    expect(result.phoneNumberId).toBeNull();
    expect(result.events).toHaveLength(0);
  });
});
