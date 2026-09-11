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

Aceito e executado na Fase 2 (2026-09-11), com uma correção real em
relação ao que este ADR previa na Fase 0 — registrada abaixo, não
silenciada.

## Correção pós-execução (Fase 2)

A leitura direta de `tools.ts` durante a Fase 2 mostrou algo que a Fase 0
não tinha inspecionado: **os 5 comandos (`bomdia`/`agora`/`estado`/
`fechardia`/`replanejamento`) nunca chamam um LLM — são 100%
determinísticos, apenas leem/escrevem Postgres via Prisma.** O único uso
real de `ai` dentro de `packages/agent-runtime` é `tools.ts`, que envolve
esses mesmos comandos como `tool()` do Vercel AI SDK para
`apps/app/app/api/chat`'s `streamText()` — a rota de chat livre que este
próprio ADR já havia disclosurado como fora de escopo.

Consequência: **`ai` NÃO foi removido de `package.json`**, ao contrário do
que a seção "Consequências" original previa. Ele continua sendo o único
SDK que `tools.ts`/`apps/app/api/chat` sabem consumir, e migrá-lo
quebraria essa rota — exatamente o "não assumir isso implicitamente" que
este ADR já registrava.

O que foi feito em vez disso:
- `@anthropic-ai/claude-agent-sdk@0.3.268` foi ADICIONADO como
  dependência (coexiste com `ai`, não o substitui).
- Novo arquivo `packages/agent-runtime/src/mcp-tools.ts`:
  `buildCopilotToolDefinitions()`/`buildCopilotMcpServer()`, a mesma
  superfície de 6 comandos que `tools.ts` expõe, mas usando `tool()` +
  `createSdkMcpServer()` do Agent SDK — é isso que `apps/copiloto-runtime`
  (Fase 3) vai passar para `query({ options: { mcpServers } })`.
- `tools.ts` permanece 100% intocado — continua sendo o que
  `apps/app/api/chat` consome.
- `commands/*`, `phases.ts`, `output-schema.ts`, `format.ts`,
  `evals/graders.ts` também permanecem intocados — nunca dependeram de
  `ai` para começar, então "preservar a superfície pública + suíte de
  testes existente sem reescrita" foi trivialmente satisfeito: **zero
  linhas desses arquivos mudaram.**
- 28 novos testes (`mcp-tools.test.ts`), seguindo o mesmo padrão
  `describe.skipIf(!process.env.DATABASE_URL)` + import dinâmico de
  `commands.test.ts` — não verificados contra um Postgres real nesta
  sessão (sandbox sem `DATABASE_URL`), mesma limitação que já valia para
  `commands.test.ts` antes desta fase.

Isso não é scope creep silencioso: é a mesma decisão (D2) executada de
forma mais precisa que a hipótese original, porque só ao ler o código se
descobriu que não havia, de fato, nenhuma chamada de modelo dentro do
núcleo determinístico a migrar — só um adaptador de exposição para o chat
livre, que já estava fora de escopo. Se uma decisão futura decidir migrar
também `apps/app/api/chat` para o runtime containerizado (Fase 3), a
migração de `tools.ts`/remoção de `ai` vira trabalho dessa decisão, não
uma reabertura deste ADR.
