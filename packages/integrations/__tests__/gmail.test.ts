import { describe, expect, it } from "vitest";
import { parseGmailPushPayload } from "../src/gmail/webhook";

describe("parseGmailPushPayload", () => {
  it("decodes a base64 Pub/Sub data field into a normalized event", () => {
    const notification = { emailAddress: "user@example.com", historyId: 42 };
    const envelope = {
      message: {
        data: Buffer.from(JSON.stringify(notification)).toString("base64"),
        messageId: "msg-1",
        publishTime: "2026-09-10T00:00:00Z",
      },
    };
    const { emailAddress, event } = parseGmailPushPayload(envelope);
    expect(emailAddress).toBe("user@example.com");
    expect(event?.externalId).toBe("msg-1");
    expect(event?.externalObjectType).toBe("gmail_history_notification");
    expect(event?.payload.historyId).toBe(42);
  });

  it("returns nulls for an envelope with no message.data", () => {
    const { emailAddress, event } = parseGmailPushPayload({});
    expect(emailAddress).toBeNull();
    expect(event).toBeNull();
  });

  it("returns nulls for undecodable base64/JSON without throwing", () => {
    expect(() =>
      parseGmailPushPayload({ message: { data: "not-valid-base64-json!!" } })
    ).not.toThrow();
    const { event } = parseGmailPushPayload({
      message: { data: "not-valid-base64-json!!" },
    });
    expect(event).toBeNull();
  });
});
