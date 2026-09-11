# ADR-004 — Migração Vercel AI SDK → Claude Agent SDK

| Campo | Valor |
|---|---|
| **Status** | Proposto (candidato) |
| **Relacionado** | D2, SDK-AGT-001 |
| **Data** | 2026-09-11 |

## Contexto

`packages/agent-runtime` hoje é construído sobre `ai@^6.0.116` (Vercel AI
SDK). D2 já decidiu migrar tudo para
`@anthropic-ai/claude-agent-sdk@0.3.268`, em runtime containerizado fora da
Vercel, pelo motivo documentado no plano: o Agent SDK sobe um subprocesso
`claude` de vida longa com disco local (~1 GiB RAM/agente, doc oficial),
incompatível com função serverless.

## Verificação nesta sessão

- `packages/agent-runtime/package.json`: `dependencies.ai = "^6.0.116"`,
  `dependencies.zod = "^4.3.6"`. Nenhuma dependência do Agent SDK.
- Grep recursivo por `claude-agent-sdk`/`@anthropic-ai/claude-agent-sdk`
  em todo o repositório (`*.json`, `*.ts`, `*.tsx`): **zero ocorrências**.
- A superfície pública que precisa ser preservada (conforme o próprio
  plano, "contrato de regressão"): `AGENT_FLOW_PHASES`, `REPLAN_RETURNS_TO`,
  os 5 `commands/*`, `output-schema.ts` (`orchestratorOutputSchema`),
  `format.ts`, `evals/graders.ts`, e a suíte de testes hoje em
  **33 passando / 4 pulando** (arquivo `__tests__/{commands,evals,format,
  output-schema,phases}.test.ts`).
- `apps/api/app/copilot/command/route.ts` consome `runPrimaryCommand` e
  `validateOrchestratorOutput` de `@repo/agent-runtime` **in-process**
  (sem HTTP intermediário) — isso muda na Fase 3 (runtime containerizado),
  não na Fase 2. A Fase 2, isoladamente, só troca o SDK por baixo da mesma
  função `runPrimaryCommand`.

## Decisão

Confirma D2 como registrada: migrar `packages/agent-runtime` de `ai@^6`
para `@anthropic-ai/claude-agent-sdk@0.3.268`, preservando a superfície
pública e fazendo a suíte de testes existente passar **sem reescrevê-la**
— ela é o contrato de regressão. A migração acontece isoladamente na
Fase 2, antes da mudança de topologia de execução (Fase 3, runtime
containerizado) — as duas não devem ser feitas no mesmo commit, para poder
isolar qual das duas introduziu uma eventual quebra.

## Consequências

- `packages/agent-runtime`'s `dependencies` perde `ai`, ganha
  `@anthropic-ai/claude-agent-sdk`.
- Qualquer uso de streaming/tool-calling específico do Vercel AI SDK
  (`streamText`, `generateObject` etc., se usado internamente em
  `tools.ts`/`prompts/system.ts`) precisa de equivalente documentado no
  Agent SDK (`query()`, `tool()` + `createSdkMcpServer()`,
  `outputFormat: {type:'json_schema'}`) — a Fase 2 deve consultar a doc
  oficial (`code.claude.com/docs/en/agent-sdk/`) para cada chamada trocada,
  não improvisar.
- `apps/app/app/api/chat` usa `@repo/ai` (não `@repo/agent-runtime`)
  diretamente para o chat livre — **fora do escopo desta migração**, a
  menos que uma decisão futura amplie D2 para cobrir também o chat livre.
  Não assumir isso implicitamente.

## Status de ratificação

Candidato — pendente de aprovação do usuário. É o ADR de maior risco desta
Fase 0 (ver `PLANO_IMPLEMENTACAO_INCREMENTAL.md` e `GRAFO_DEPENDENCIAS.md`
§3).
