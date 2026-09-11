import {
  createSdkMcpServer,
  type SdkMcpToolDefinition,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { runPrimaryCommand } from "./commands";
import {
  confirmReplan,
  proposeReplan,
  type ReplanProposal,
} from "./commands/replanejamento";

const replanTaskSchema = z.object({ title: z.string().min(1) });

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

/**
 * Fase 2 (D2 / ADR-004, docs/executar/ADRS_CANDIDATOS) — a superfície
 * equivalente a tools.ts (buildCopilotTools), mas para o Claude Agent SDK
 * (tool() + createSdkMcpServer()) em vez do Vercel AI SDK. Este é o
 * adaptador que apps/copiloto-runtime (Fase 3) vai passar em
 * `query({ options: { mcpServers } })`.
 *
 * tools.ts continua intocado de propósito: ele serve exclusivamente
 * apps/app/app/api/chat's streamText() (o chat livre com @repo/ai), que
 * ADR-004 disclosurou como fora do escopo de D2 até uma decisão futura
 * ampliar esse escopo explicitamente. As duas superfícies coexistem por
 * desenho — o mesmo par de comandos determinísticos, dois adaptadores de
 * SDK diferentes, cada um para o consumidor que já usa aquele SDK. Não é
 * duplicação acidental: remover uma delas quebraria seu único consumidor
 * real.
 *
 * `workspaceId`/`confirmedByActorRef` ficam no closure, nunca em um
 * argumento que o modelo preenche — mesmo padrão de segurança que
 * packages/mcp/src/server.ts (M12) já usa para os 12 tools MCP HTTP.
 *
 * Retorna as definições cruas (ainda não empacotadas num MCP server) —
 * separado de buildCopilotMcpServer() para que os testes encontrem um
 * handler pelo nome e o chamem diretamente, do mesmo jeito que os testes
 * de packages/mcp chamam suas funções de tool individuais (tasksList,
 * projectsGet, ...) em vez de acessar uma sessão/McpServer ao vivo.
 * Anotado como SdkMcpToolDefinition[] (o parâmetro de tipo default do
 * SDK) em vez de deixar o TS inferir uma união de shapes por elemento —
 * sem essa anotação, `.find(...)?.handler(args)` exige `args` satisfazer
 * a interseção de todos os shapes do array, não apenas o do tool
 * encontrado.
 */
export const buildCopilotToolDefinitions = (
  workspaceId: string,
  confirmedByActorRef: string
): SdkMcpToolDefinition[] => {
  const bomdia = tool(
    "bomdia",
    "Comando /bomdia: valida a tarefa em execução anterior e resolve o trabalho liberado para hoje.",
    {},
    async () => textResult(await runPrimaryCommand("bomdia", workspaceId)),
    { annotations: { readOnlyHint: true } }
  );

  const agora = tool(
    "agora",
    "Comando /agora: mostra somente o objeto atual (WIP=1) e a próxima ação.",
    {},
    async () => textResult(await runPrimaryCommand("agora", workspaceId)),
    { annotations: { readOnlyHint: true } }
  );

  const estado = tool(
    "estado",
    "Comando /estado: progresso derivado, fila de execução e bloqueios.",
    {},
    async () => textResult(await runPrimaryCommand("estado", workspaceId)),
    { annotations: { readOnlyHint: true } }
  );

  const fechardia = tool(
    "fechardia",
    "Comando /fechardia: valida evidência e reporta o gate de autoridade para fechar a tarefa atual — nunca conclui sozinho.",
    {},
    async () => textResult(await runPrimaryCommand("fechardia", workspaceId)),
    { annotations: { readOnlyHint: true } }
  );

  const proporReplanejamento = tool(
    "proporReplanejamento",
    "Propõe um novo entregável com tarefas (PRE_APPROVE) — NÃO cria nada ainda, apenas mostra a estrutura para aprovação humana.",
    {
      deliverableTitle: z.string().min(1),
      projectId: z.string().optional(),
      tasks: z.array(replanTaskSchema).min(1),
    },
    async (args) =>
      textResult(proposeReplan(args satisfies Omit<ReplanProposal, "dueDate">)),
    { annotations: { readOnlyHint: true } }
  );

  const confirmarReplanejamento = tool(
    "confirmarReplanejamento",
    "Confirma e decompõe um plano previamente proposto — só use depois que o humano confirmar explicitamente.",
    {
      deliverableTitle: z.string().min(1),
      projectId: z.string().optional(),
      tasks: z.array(replanTaskSchema).min(1),
    },
    async (args) =>
      textResult(await confirmReplan(workspaceId, args, confirmedByActorRef)),
    { annotations: { readOnlyHint: false, destructiveHint: false } }
  );

  // Cast, not a structural fit: each tool() call above returns a
  // SdkMcpToolDefinition<Schema> with its OWN concrete Schema (verified by
  // tsc at each call site above), but TS's function-parameter
  // contravariance means a narrower handler (e.g. one requiring
  // {deliverableTitle, projectId, tasks}) isn't structurally assignable to
  // the wider SdkMcpToolDefinition (default Schema = AnyZodRawShape) this
  // array's declared element type needs — the same reason a mixed array
  // of typed event handlers commonly needs this in TS. Safe here because
  // buildCopilotToolDefinitions/buildCopilotMcpServer are the only
  // callers, and each handler is only ever invoked by the Agent SDK after
  // validating its own args against its own schema.
  return [
    bomdia,
    agora,
    estado,
    fechardia,
    proporReplanejamento,
    confirmarReplanejamento,
  ] as SdkMcpToolDefinition[];
};

export const buildCopilotMcpServer = (
  workspaceId: string,
  confirmedByActorRef: string
) =>
  createSdkMcpServer({
    name: "executar-copiloto",
    version: "0.0.0",
    tools: buildCopilotToolDefinitions(workspaceId, confirmedByActorRef),
  });

/**
 * Nomes totalmente qualificados (`mcp__executar-copiloto__<tool>`) —
 * convenção do Agent SDK para `allowedTools`. Exportado como constante
 * para apps/copiloto-runtime (Fase 3) não precisar reconstruir a string
 * à mão em cada chamada de `query()`.
 */
export const COPILOT_MCP_TOOL_NAMES = [
  "mcp__executar-copiloto__bomdia",
  "mcp__executar-copiloto__agora",
  "mcp__executar-copiloto__estado",
  "mcp__executar-copiloto__fechardia",
  "mcp__executar-copiloto__proporReplanejamento",
  "mcp__executar-copiloto__confirmarReplanejamento",
] as const;
