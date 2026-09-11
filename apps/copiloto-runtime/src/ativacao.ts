import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  buildCopilotMcpServer,
  COPILOT_MCP_TOOL_NAMES,
} from "@repo/agent-runtime";
import {
  type AdvanceFaseAtivacaoResult,
  advanceFaseAtivacao,
} from "@repo/domain";
import {
  backlogInicialSchema,
  type FaseAtivacao,
  fonteAutorizadaSchema,
  type HandoffEnvelope,
  modeloOperacionalSchema,
  perfilOperacionalSchema,
  primeiroEntregavelSchema,
  rotinasPropostasLoteSchema,
} from "@repo/schemas";
import { z } from "zod";
import { env } from "../env";
import { buildAgentHooks, createAgentRun, finishAgentRun } from "./hooks";
import { createPostgresSessionStore } from "./session-store";
import { buildTenantQueryOptions } from "./tenant";

/**
 * Fase 6 (D5, plano §6.4) — "carregado via opção `plugins` (caminho
 * local) — não via `settingSources`, para permitir `settingSources: []`
 * (isolamento multi-tenant)." `packages/copiloto-skills` tem o manifesto
 * `.claude-plugin/plugin.json` + `skills/executar-.../SKILL.md` exigidos
 * por essa opção. Caminho resolvido a partir deste arquivo, não do
 * `cwd` do processo (que é per-tenant e não contém as skills — ver
 * tenant.ts).
 *
 * Disclosure: o formato exato de `.claude-plugin/plugin.json`
 * (campos aceitos além de name/version/description) não foi verificado
 * contra a documentação oficial nesta fase — só o campo `path` de
 * `SdkPluginConfig` foi conferido diretamente em sdk.d.ts. Se o plugin
 * não carregar em uma sessão real, revisar o manifesto contra
 * code.claude.com/docs/en/agent-sdk primeiro.
 */
const COPILOTO_SKILLS_PLUGIN_PATH = new URL(
  "../../../packages/copiloto-skills",
  import.meta.url
).pathname;

/**
 * Fase 5 (plano §6.2/§7) — "a Camada 1 é sequência fixa ⇒ orquestração
 * determinística em código, com o Agent SDK atuando *dentro* de cada
 * etapa." Esta é a peça que conecta o orquestrador puro
 * (`packages/domain/src/ativacao-orchestrator.ts`) a uma chamada real
 * de `query()` com `outputFormat: {type:'json_schema'}` por etapa —
 * exatamente o que o plano pede para esta fase.
 *
 * Não verificado contra uma sessão real do Agent SDK nesta sessão
 * sandbox (mesma limitação de server.ts/hooks.ts: sem
 * ANTHROPIC_API_KEY/Postgres reais aqui).
 */

// z.toJSONSchema() (Zod 4 core) — outputFormat exige JSON Schema, não
// um ZodType diretamente.
const FASE_OUTPUT_JSON_SCHEMAS: Partial<
  Record<FaseAtivacao, Record<string, unknown>>
> = {
  ONBOARDING: z.toJSONSchema(perfilOperacionalSchema),
  SCANNER: z.toJSONSchema(z.array(fonteAutorizadaSchema)),
  PRODUCTIVITY: z.toJSONSchema(backlogInicialSchema),
  OPERATIONS: z.toJSONSchema(modeloOperacionalSchema),
  MODO_ROTINA: z.toJSONSchema(rotinasPropostasLoteSchema),
  PRIMEIRO_ENTREGAVEL: z.toJSONSchema(primeiroEntregavelSchema),
};

export type RunFaseAtivacaoResult =
  | {
      readonly ok: true;
      readonly envelope: HandoffEnvelope;
      readonly sessionId: string | undefined;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly sessionId?: string | undefined;
    };

/**
 * Executa a fase `faseOrigem` (gerando sua saída via `query()` com
 * `outputFormat` fixado no schema daquela fase) e valida o handoff
 * resultante para `faseDestino` com `advanceFaseAtivacao()` — o mesmo
 * orquestrador puro, agora alimentado por uma chamada real do SDK em
 * vez de um payload fabricado em teste. Implementa literalmente o
 * aceite da Fase 5: "Operations não inicia sem saída válida de
 * Productivity" — se `structured_output` não validar contra o schema
 * de `faseOrigem`, `advanceFaseAtivacao` rejeita antes de
 * `faseDestino` ser considerada iniciada.
 */
export const runFaseAtivacao = async (
  workspaceId: string,
  faseOrigem: FaseAtivacao,
  faseDestino: FaseAtivacao,
  prompt: string,
  actorRef = "copiloto-runtime"
): Promise<RunFaseAtivacaoResult> => {
  const outputSchema = FASE_OUTPUT_JSON_SCHEMAS[faseOrigem];
  if (!outputSchema) {
    return {
      ok: false,
      reason: `Fase "${faseOrigem}" não tem outputFormat definido (CONCLUIDA é terminal, sem saída própria).`,
    };
  }
  if (!env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      reason: "ANTHROPIC_API_KEY is not configured for this container.",
    };
  }

  const tenantOptions = buildTenantQueryOptions(workspaceId);
  const sessionStore = createPostgresSessionStore(workspaceId);
  const mcpServer = buildCopilotMcpServer(workspaceId, actorRef);
  const agentRunId = await createAgentRun(workspaceId, faseOrigem, {
    prompt,
    faseDestino,
  });

  let sessionId: string | undefined;
  let structuredOutput: unknown;

  try {
    for await (const message of query({
      prompt,
      options: {
        ...tenantOptions,
        sessionStore,
        mcpServers: { "executar-copiloto": mcpServer },
        allowedTools: [...COPILOT_MCP_TOOL_NAMES],
        hooks: buildAgentHooks(workspaceId, agentRunId),
        outputFormat: { type: "json_schema", schema: outputSchema },
        plugins: [{ type: "local", path: COPILOTO_SKILLS_PLUGIN_PATH }],
      },
    })) {
      if (message.type === "result") {
        sessionId = message.session_id;
        if (message.subtype === "success") {
          structuredOutput = message.structured_output;
        }
      }
    }

    if (structuredOutput === undefined) {
      throw new Error(
        `query() não retornou structured_output para a fase ${faseOrigem}.`
      );
    }
  } catch (error) {
    await finishAgentRun(workspaceId, agentRunId, "FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      sessionId,
    };
  }

  const envelope: HandoffEnvelope = {
    faseOrigem,
    faseDestino,
    workspaceId,
    producedAt: new Date().toISOString(),
    producedBy: "AGENT",
    payload: structuredOutput as Record<string, unknown>,
  };

  const advance: AdvanceFaseAtivacaoResult = advanceFaseAtivacao(envelope);
  await finishAgentRun(
    workspaceId,
    agentRunId,
    advance.ok ? "SUCCESS" : "BLOCKED",
    { advance }
  );

  if (!advance.ok) {
    return { ok: false, reason: advance.reason, sessionId };
  }

  return { ok: true, envelope, sessionId };
};
