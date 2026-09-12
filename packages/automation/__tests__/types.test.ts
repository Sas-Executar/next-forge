import { describe, expect, test } from "vitest";
import { workflowDefinitionConfigSchema } from "../src/types";

describe("workflowDefinitionConfigSchema (M10-T05)", () => {
  test("accepts a minimal valid definition", () => {
    const result = workflowDefinitionConfigSchema.safeParse({
      trigger: { type: "manual", schedule: null },
      steps: [{ id: "s1", action: "notify", params: { message: "hi" } }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty steps array", () => {
    const result = workflowDefinitionConfigSchema.safeParse({
      trigger: { type: "manual", schedule: null },
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects an unknown step action", () => {
    const result = workflowDefinitionConfigSchema.safeParse({
      trigger: { type: "manual", schedule: null },
      steps: [{ id: "s1", action: "complete_task", params: {} }],
    });
    expect(result.success).toBe(false);
  });
});
