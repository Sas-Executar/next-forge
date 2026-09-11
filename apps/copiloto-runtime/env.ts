import { keys as database } from "@repo/database/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Fase 3 — env contract for the standalone container (not a Vercel app,
 * but reuses @t3-oss/env-nextjs for the same validate-at-import-time
 * behavior every other package.json's `keys.ts`/app's `env.ts` already
 * relies on in this monorepo, e.g. packages/database/keys.ts).
 *
 * ANTHROPIC_API_KEY is the runtime's own credential — read by the Agent
 * SDK's subprocess from its environment (doc: "the subprocess reads
 * ANTHROPIC_API_KEY from its environment"), never passed through the
 * app's own request/response bodies. Optional here (not `.min(1)`
 * required) because this sandbox has no real key to validate against —
 * server.ts fails fast at request time instead if it's actually missing
 * when a session is created, per the same "skip, don't fail closed"
 * principle QUALITY_GATES.md documents for credential-gated code paths.
 */
export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  extends: [database()],
  server: {
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    COPILOTO_RUNTIME_PORT: z.coerce.number().int().positive().default(8787),
    // Base directory for per-tenant cwd/CLAUDE_CONFIG_DIR (Fase 3 multi-
    // tenant isolation, docs.claude.com/en/agent-sdk/hosting). Defaults
    // assume a container filesystem, not this dev sandbox's repo tree —
    // never resolved against process.cwd().
    COPILOTO_RUNTIME_WORK_DIR: z.string().min(1).default("/work/tenants"),
    COPILOTO_RUNTIME_CONFIG_DIR: z
      .string()
      .min(1)
      .default("/work/claude-config"),
    // Fase 9 (PLANO_OBSERVABILIDADE_OPERACAO.md's own Fase 9 row: "OTEL
    // real no container, CLAUDE_CODE_ENABLE_TELEMETRY=1, exporters
    // OTLP") — these are read directly by the Claude Code CLI
    // subprocess itself (docs.claude.com/en/docs/claude-code/monitoring-usage),
    // not by this app's own code; tenant.ts's `env: { ...process.env,
    // ... }` already forwards whatever is set here into every query()
    // call without further wiring. Validating and typing them here is
    // what actually changes: a real, documented, single place naming
    // this runtime's telemetry config surface, and a schema that fails
    // fast on a typo'd value instead of the subprocess silently not
    // exporting anything. All optional and unset by default — this
    // sandbox has no real OTLP collector to verify export against, so
    // nothing here enables telemetry on its own; an operator opts in by
    // actually setting these at deploy time.
    CLAUDE_CODE_ENABLE_TELEMETRY: z.enum(["0", "1"]).optional(),
    OTEL_METRICS_EXPORTER: z.string().min(1).optional(),
    OTEL_LOGS_EXPORTER: z.string().min(1).optional(),
    OTEL_EXPORTER_OTLP_PROTOCOL: z.string().min(1).optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().min(1).optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().min(1).optional(),
  },
  runtimeEnv: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    COPILOTO_RUNTIME_PORT: process.env.COPILOTO_RUNTIME_PORT,
    COPILOTO_RUNTIME_WORK_DIR: process.env.COPILOTO_RUNTIME_WORK_DIR,
    COPILOTO_RUNTIME_CONFIG_DIR: process.env.COPILOTO_RUNTIME_CONFIG_DIR,
    CLAUDE_CODE_ENABLE_TELEMETRY: process.env.CLAUDE_CODE_ENABLE_TELEMETRY,
    OTEL_METRICS_EXPORTER: process.env.OTEL_METRICS_EXPORTER,
    OTEL_LOGS_EXPORTER: process.env.OTEL_LOGS_EXPORTER,
    OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  },
});
