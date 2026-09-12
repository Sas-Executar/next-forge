import { describe, expect, it } from "vitest";
import {
  extractValidationToken,
  parseOutlookNotifications,
} from "../src/outlook/webhook";

describe("extractValidationToken", () => {
  it("reads the validationToken query parameter", () => {
    const params = new URLSearchParams({ validationToken: "abc123" });
    expect(extractValidationToken(params)).toBe("abc123");
  });

  it("returns null when absent", () => {
    expect(extractValidationToken(new URLSearchParams())).toBeNull();
  });
});

describe("parseOutlookNotifications", () => {
  const clientState = "workspace-shared-secret";

  it("accepts notifications whose clientState matches", () => {
    const envelope = {
      value: [
        {
          subscriptionId: "sub-1",
          clientState,
          resource: "me/messages/abc",
          resourceData: { id: "abc" },
          changeType: "created",
        },
      ],
    };
    const events = parseOutlookNotifications(envelope, clientState);
    expect(events).toHaveLength(1);
    expect(events[0]?.externalId).toBe("abc");
    expect(events[0]?.externalObjectType).toBe("outlook_message");
  });

  it("drops notifications whose clientState doesn't match, without throwing", () => {
    const envelope = {
      value: [
        {
          subscriptionId: "sub-1",
          clientState: "attacker-guess",
          resource: "me/messages/abc",
          resourceData: { id: "abc" },
          changeType: "created",
        },
      ],
    };
    expect(() =>
      parseOutlookNotifications(envelope, clientState)
    ).not.toThrow();
    expect(parseOutlookNotifications(envelope, clientState)).toHaveLength(0);
  });

  it("returns an empty list for an envelope with no value array", () => {
    expect(parseOutlookNotifications({}, clientState)).toHaveLength(0);
  });
});
