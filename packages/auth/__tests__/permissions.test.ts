import { describe, expect, test } from "vitest";
import {
  hasRole,
  PERMISSION_MATRIX,
  type PermissionMatrixRow,
  ROLE_RANK,
} from "../src/permissions";

/**
 * M16-T01 — walks the real permission matrix and, for every row that
 * carries a `verify()` closure, re-runs the actual production guard the
 * row describes and asserts it still returns what the row claims. A row
 * with no `verify()` (documented inline on that row: an OAuth/Stripe
 * side effect, or a fact too trivial to re-derive without pulling in a
 * DB-eager package) is only checked structurally below — every row must
 * still cite a real `source`.
 */
describe("PERMISSION_MATRIX (M16-T01)", () => {
  test("every row cites the real source it documents", () => {
    for (const row of PERMISSION_MATRIX) {
      expect(row.source.length).toBeGreaterThan(0);
      expect(row.resource.length).toBeGreaterThan(0);
      expect(row.action.length).toBeGreaterThan(0);
    }
  });

  test.each(
    PERMISSION_MATRIX.filter((row) => row.verify)
  )("$actor $resource — $action matches the live guard it documents", (row: PermissionMatrixRow) => {
    expect(row.verify?.()).toBe(true);
  });

  test("at least one row exists for every actor type this codebase uses (USER, AGENT, SYSTEM)", () => {
    const actors = new Set(PERMISSION_MATRIX.map((row) => row.actor));
    expect(actors).toEqual(new Set(["USER", "AGENT", "SYSTEM"]));
  });
});

describe("hasRole (shared with requireRole(), packages/auth/server.ts)", () => {
  test("OWNER satisfies a MEMBER requirement", () => {
    expect(hasRole("OWNER", "MEMBER")).toBe(true);
  });

  test("MEMBER does not satisfy an OWNER requirement", () => {
    expect(hasRole("MEMBER", "OWNER")).toBe(false);
  });

  test("a role always satisfies its own requirement", () => {
    expect(hasRole("MEMBER", "MEMBER")).toBe(true);
    expect(hasRole("OWNER", "OWNER")).toBe(true);
  });

  test("ROLE_RANK strictly orders MEMBER below OWNER", () => {
    expect(ROLE_RANK.MEMBER).toBeLessThan(ROLE_RANK.OWNER);
  });
});
