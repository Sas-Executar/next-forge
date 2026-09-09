/**
 * AGENT-FLOW-001 capability order (docs/05-agent/COPILOT_ORCHESTRATION_FLOW.md,
 * Blueprint, read-only). Kept as a plain ordered tuple, not a full FSM
 * with transition guards for every phase — the spec itself describes
 * each phase's contract in prose, not as a table of legal transitions,
 * so encoding one here would be inventing structure the source doesn't
 * have. What IS a real, enforceable rule from the spec is the REPLAN
 * gate below.
 */
export const AGENT_FLOW_PHASES = [
  "SYNC",
  "UNDERSTAND",
  "STRUCTURE",
  "VISUALIZE",
  "PRE_APPROVE",
  "DECOMPOSE",
  "EXECUTE",
  "RECONCILE",
  "REPORT",
  "REPLAN",
] as const;

export type AgentFlowPhase = (typeof AGENT_FLOW_PHASES)[number];

/**
 * "Antes da nova decomposição, retornar ao gate VISUALIZE → PRE_APPROVE."
 * The one structural rule AGENT-FLOW-001 states explicitly enough to
 * enforce in code: REPLAN never feeds DECOMPOSE directly. Used by
 * commands/replanejamento.ts to keep proposeReplan() and confirmReplan()
 * honest about which phase they're each standing in for.
 */
export const REPLAN_RETURNS_TO: AgentFlowPhase = "VISUALIZE";

export const isDecomposePhase = (phase: AgentFlowPhase): boolean =>
  phase === "DECOMPOSE";
