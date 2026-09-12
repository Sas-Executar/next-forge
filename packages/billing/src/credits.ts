import "server-only";

import { forWorkspace, type Prisma } from "@repo/database";

/**
 * Execution Credits ledger (M13-T03, `UsageLedger`/`ExecutionCredit`
 * tables provisioned in M02). PRICING-001 §7: "franquia incluída por
 * plano; top-up/overage após franquia; não expor tokens de modelo ao
 * usuário; não cobrar por operações simples de estado quando puderem
 * ser executadas com COGS marginal mínimo." schema.prisma's own comment
 * on ExecutionCredit: "Não expomos tokens — o cliente compra capacidade
 * de execução" (Financeiro.md, Blueprint, read-only) — signed amount,
 * positive = grant, negative = consumption.
 *
 * Disclosed gap, consistent with entitlements.ts's own: PRICING-001
 * never gives an actual numeric Execution Credits allowance per plan
 * (only "franquia básica" vs "franquia maior", qualitative) and no
 * Financeiro.md/UNIT-ECON-001 standalone doc exists in the Blueprint
 * repo to supply one (confirmed directly — only a CSV of aggregate
 * scenario economics, no per-plan credit unit numbers). This module is
 * therefore a real, correct, general-purpose ledger — grant, consume,
 * balance, atomic, never silently letting a workspace go negative — but
 * takes the included-allowance and warning-threshold amounts as caller-
 * supplied parameters rather than hardcoding fabricated numbers. Wiring
 * a specific number in is a pricing decision for whoever owns
 * PRICING-001, not a technical one this milestone can responsibly make
 * up.
 */
export type CreditGrantReason =
  | "PLAN_ALLOWANCE"
  | "TOP_UP"
  | "MANUAL_ADJUSTMENT";
export type CreditConsumeReason = "AI_USAGE" | "WHATSAPP_USAGE";

const sumCredits = async (workspaceId: string): Promise<number> => {
  const aggregate = await forWorkspace(workspaceId).executionCredit.aggregate({
    where: { workspaceId },
    _sum: { amount: true },
  });
  return Number(aggregate._sum.amount ?? 0);
};

export const getCreditBalance = (workspaceId: string): Promise<number> =>
  sumCredits(workspaceId);

const recordCredit = (workspaceId: string, amount: number, reason: string) => {
  const db = forWorkspace(workspaceId);
  return db.$transaction(async (tx) => {
    const before = await tx.executionCredit.aggregate({
      where: { workspaceId },
      _sum: { amount: true },
    });
    const balanceAfter = Number(before._sum.amount ?? 0) + amount;
    return tx.executionCredit.create({
      data: { workspaceId, amount, reason, balanceAfter },
    });
  });
};

/** Adds credits (a plan's monthly allowance, a manual top-up, or a manual adjustment) — always a positive grant. */
export const grantCredits = (
  workspaceId: string,
  amount: number,
  reason: CreditGrantReason
) => {
  if (amount <= 0) {
    throw new Error(`grantCredits amount must be positive, got ${amount}`);
  }
  return recordCredit(workspaceId, amount, reason);
};

export type ConsumeCreditsResult =
  | { readonly status: "OK"; readonly balanceAfter: number }
  | {
      readonly status: "INSUFFICIENT";
      readonly balance: number;
      readonly requested: number;
    };

/**
 * Consumes credits for a real AI/WhatsApp usage event. Never lets a
 * workspace go silently negative — PRICING-001 §9's own overage/top-up
 * language ("top-up/overage após franquia") and this repo's general
 * "never invent state" discipline both point the same way: an
 * insufficient balance is a structured result the caller must handle
 * (prompt a top-up), not a mutation that happens anyway.
 */
export const consumeCredits = (
  workspaceId: string,
  amount: number,
  reason: CreditConsumeReason
): Promise<ConsumeCreditsResult> => {
  if (amount <= 0) {
    throw new Error(`consumeCredits amount must be positive, got ${amount}`);
  }
  const db = forWorkspace(workspaceId);
  return db.$transaction(async (tx) => {
    const before = await tx.executionCredit.aggregate({
      where: { workspaceId },
      _sum: { amount: true },
    });
    const balance = Number(before._sum.amount ?? 0);
    if (balance < amount) {
      return { status: "INSUFFICIENT", balance, requested: amount } as const;
    }
    const balanceAfter = balance - amount;
    await tx.executionCredit.create({
      data: { workspaceId, amount: -amount, reason, balanceAfter },
    });
    return { status: "OK", balanceAfter } as const;
  });
};

/**
 * Records raw usage (OBS-006's per-call tracking granularity — e.g. AI
 * tokens, WhatsApp messages) independent of the credits ledger's signed
 * balance — `UsageLedger` is the audit-grade "what was actually
 * consumed" record; `ExecutionCredit` is "what that cost against the
 * workspace's allowance." Kept as two separate writes deliberately, not
 * merged into one row, matching the two distinct tables M02 already
 * provisioned for this.
 */
export const recordUsage = (
  workspaceId: string,
  input: {
    readonly category: string;
    readonly amount: number;
    readonly unit: string;
    readonly periodStart: Date;
    readonly periodEnd: Date;
  }
) =>
  forWorkspace(workspaceId).usageLedger.create({
    data: {
      workspaceId,
      category: input.category,
      amount: input.amount as unknown as Prisma.Decimal,
      unit: input.unit,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });
