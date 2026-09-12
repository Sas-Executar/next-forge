import { randomUUID } from "node:crypto";
import type { database as Database } from "@repo/database";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { auditMcpToolCall as AuditMcpToolCall } from "../src/context";

describe.skipIf(!process.env.DATABASE_URL)("auditMcpToolCall (M12-T03)", () => {
  const suffix = randomUUID();
  let database: typeof Database;
  let auditMcpToolCall: typeof AuditMcpToolCall;
  let workspaceId: string;

  beforeAll(async () => {
    ({ database } = await import("@repo/database"));
    ({ auditMcpToolCall } = await import("../src/context"));

    const workspace = await database.workspace.create({
      data: { clerkOrgId: `org_mcp_audit_${suffix}`, name: "MCP Audit" },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await database.workspace.delete({ where: { id: workspaceId } });
    await database.$disconnect();
  });

  test("writes a real AGENT-actor AuditEvent naming the tool as authorityRuleId", async () => {
    await auditMcpToolCall(
      { workspaceId, actorRef: "user_audit_test" },
      {
        toolName: "evidence.create",
        action: "CREATE",
        objectType: "Evidence",
        objectId: "ev_123",
        metadata: { taskId: "task_123" },
      }
    );

    const [event] = await database.auditEvent.findMany({
      where: { workspaceId, objectType: "Evidence", objectId: "ev_123" },
    });
    expect(event.actorType).toBe("AGENT");
    expect(event.actorRef).toBe("user_audit_test");
    expect(event.authorityRuleId).toBe("mcp:evidence.create");
    expect(event.metadata).toEqual({ taskId: "task_123" });
  });
});
