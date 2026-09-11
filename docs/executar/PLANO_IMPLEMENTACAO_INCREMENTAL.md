# Plano de Implementação Incremental — Fase 0 (saída)

Reformula `PLANO_EXECUTAR_COPILOTO.md` §7 (Fases 1–9) como uma sequência de
incrementos com aceite verificável e reversível, incorporando o que esta
Fase 0 descobriu. Não inicia nenhuma fase — é o roteiro para a próxima
sessão aprovar fase a fase, conforme o prompt de ativação exige.

## Princípio geral

Cada fase só começa depois de: (a) a fase anterior estar com aceite
verificado (não apenas "implementado"), (b) `bun run typecheck` + `turbo
test` verdes contra a linha de base desta Fase 0 (**281 passando / 141
pulando / 0 falhando / 37-37 typecheck**), e (c) aprovação explícita do
usuário para aquela fase específica — nunca em lote.

## Fase 1 — Contratos da Camada 1 (baixo risco)

- **Entrada**: `ADR-003` ratificado (mapa Camada 1 × Camada 2).
- **Trabalho**: estender `packages/schemas` (`HandoffEnvelope`,
  `FaseAtivacao`, `PerfilOperacional`, `FonteAutorizada`,
  `ModeloOperacional`) e `packages/domain` (máquina de estados da Camada 1),
  isolados dos arquivos existentes — só adição, sem tocar
  `task-state.ts`/`routine-state.ts`.
- **Risco**: baixo — pacotes novos ou aditivos, sem consumidor ainda.
- **Aceite**: Vitest cobre transições válidas/inválidas; `bun run check`
  verde; **nenhum arquivo de `@repo/agent-runtime` tocado**.

## Fase 2 — Migração para o Claude Agent SDK (risco alto, isolar) — ✅ EXECUTADA

- **Entrada**: `ADR-004` ratificado.
- **Trabalho real** (corrigido em relação à hipótese original — ver a
  seção "Correção pós-execução" em `ADR-004`): a leitura de `tools.ts`
  mostrou que os 5 comandos nunca chamam um LLM — são determinísticos,
  só Prisma. `ai` continua em `package.json` porque `tools.ts` é o único
  consumidor real de `packages/agent-runtime` que fala Vercel AI SDK
  (para `apps/app/api/chat`, já fora de escopo por este mesmo ADR).
  `@anthropic-ai/claude-agent-sdk@0.3.268` foi ADICIONADO (coexiste, não
  substitui) e um novo arquivo `src/mcp-tools.ts`
  (`buildCopilotToolDefinitions`/`buildCopilotMcpServer`) expõe os mesmos
  6 comandos via `tool()`/`createSdkMcpServer()` do Agent SDK, para a
  Fase 3 consumir.
- **Risco**: baixo na prática — `commands/*`, `phases.ts`,
  `output-schema.ts`, `format.ts`, `evals/graders.ts` (o que
  `apps/api/copilot/command` de fato consome) não foram tocados; só
  arquivo novo + `tools.ts` intocado.
- **Aceite**: suíte de `agent-runtime` (33 passando/4 pulando) continua
  **idêntica, zero linhas alteradas** nos arquivos que a compõem; 28
  novos testes em `mcp-tools.test.ts` (mesmo padrão skipIf/DATABASE_URL,
  não verificados contra Postgres real nesta sessão sandbox);
  `apps/api/__tests__/copilot-command.test.ts` (3 testes) segue verde,
  sem alteração de topologia. `bun run typecheck` 37/37, lint 0 erros,
  `bun run test` 18/18 pacotes com sucesso.
- **Rollback**: reverter o commit desta fase (aditivo — `mcp-tools.ts` +
  `mcp-tools.test.ts` + 1 linha em `package.json`/`index.ts`).

## Fase 3 — Runtime containerizado (risco alto, muda topologia) — ✅ EXECUTADA (parcialmente verificável)

- **Entrada**: Fase 2 aceita e estável.
- **Trabalho real**: novo `apps/copiloto-runtime` — `POST /sessoes`,
  `POST /sessoes/:id/mensagens`, `GET /sessoes/:id/stream` (SSE),
  `GET /health`; `src/tenant.ts` (isolamento multi-tenant: `cwd`,
  `settingSources: []`, `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`
  por workspace); `src/session-store.ts` (`SessionStore` real sobre Postgres,
  novos models `AgentSessionEntry`/`AgentSessionSummary` em
  `packages/database/prisma/schema.prisma` + migration
  `20260911190000_agent_session_store`); `Dockerfile`.
- **Correção em relação à hipótese original**: `apps/api/app/copilot/
  command/route.ts` **NÃO foi mudado para proxy**. Motivo: essa rota serve
  os 4 comandos 100% determinísticos (confirmado na Fase 2 — nunca chamam
  um LLM), que não precisam do container. A mudança de topologia real
  ("apps/api → copiloto-runtime") só se aplica ao dia em que uma decisão
  futura mover o chat livre (`apps/app/api/chat`) ou os agentes da Camada 1
  (Fase 5) para o runtime containerizado — nenhum dos dois é esta Fase 3.
  `copilot-command.test.ts` continua exatamente como estava, sem mock novo
  — não há topologia nova para essa rota mockar.
- **Risco real**: baixo para o código existente (nada em `apps/api`/
  `apps/app` foi tocado); alto para o código novo em si, que **não pôde
  ser verificado ponta a ponta nesta sessão**:
  - Sem `ANTHROPIC_API_KEY` real neste sandbox → nenhuma chamada `query()`
    real foi executada. `runQuery()`/`handleStream()` são código real,
    typechecked, com a lógica de roteamento/validação testada (mockando
    `@repo/database`/`@repo/agent-runtime`, mesmo padrão de
    `apps/api/__tests__/*.test.ts`) — mas o caminho que efetivamente invoca
    o SDK nunca rodou aqui.
  - Sem Postgres real neste sandbox → `session-store.ts` está com 8 testes
    reais escritos (`describe.skipIf(DATABASE_URL)`, mesmo padrão de
    `commands.test.ts`), **todos pulados** nesta sessão.
  - Sem daemon Docker neste sandbox (`docker version` alcança o CLI, não
    o socket) → o `Dockerfile` nunca foi buildado nem rodado.
  - **Consequência direta**: o aceite original da Fase 3 ("query() ponta a
    ponta contra o container; reiniciar o container e resume da mesma
    sessão preserva contexto") **não está verificado** — está
    implementado e typechecked, não mais que isso, pela escada de
    maturidade do próprio `AGENTS.md`.
- **O que está de fato verificado**: `bun run typecheck` 38/38 pacotes;
  `bunx ultracite check .` 0 erros; `bun run test` 19/19 pacotes com
  sucesso — 16 novos testes passando em `copiloto-runtime` (rotas +
  isolamento de tenant), 8 nomeados mas pulados (`session-store.test.ts`).
- **Antes de confiar nesta fase como "verificada"**: rodar
  `DATABASE_URL=... bun run test` em `apps/copiloto-runtime` contra um
  Postgres real com a migration aplicada; setar `ANTHROPIC_API_KEY` e
  testar `POST /sessoes` manualmente; `docker build`/`docker run` o
  `Dockerfile` contra um daemon real.

## Fase 4 — Tools, hooks, permissões e Modo Rotina — ✅ EXECUTADA (parcialmente)

Executada sem esperar D9a/D10 formalmente fechadas — ambas seguem
`DECISAO_REQUERIDA`, mas o código não ficava bloqueado por elas (ver
disclosure abaixo em cada item).

- **Tools MCP com `tenant_id` no closure**: já satisfeito desde a Fase 2
  (`buildCopilotToolDefinitions`/`buildCopilotMcpServer`) — nada novo
  aqui, só confirmado.
- **Hooks**: `apps/copiloto-runtime/src/hooks.ts` — `createAgentRun`/
  `finishAgentRun` (abre/fecha `AgentRun`, reusando o model já existente
  desde M06) e `buildAgentHooks(workspaceId, agentRunId)`: `PreToolUse`
  nega qualquer tool fora da allowlist explícita (`COPILOT_MCP_TOOL_NAMES`)
  — forma genérica e mais forte do "executar-scanner não consegue
  gravar" do plano original, já que não existe hoje uma tool de scanner
  para negar especificamente (isso é Fase 8); `PostToolUse`/
  `PostToolUseFailure` gravam `ToolCall` + `AuditEvent` para toda
  chamada, sucesso ou falha — mesmo padrão de auditoria que
  `packages/mcp/src/server.ts` já usa. Fiado em `apps/copiloto-runtime/
  src/server.ts`.
- **Modo Rotina como máquina nomeada**: `packages/schemas/src/
  modo-rotina.ts` (`rotinaNormativaStatusSchema`: PROPOSTO→CONFIRMADO→
  ATIVO⇄PAUSADO, ATIVO→REVISAO→ATIVO — exatamente a máquina do plano
  §5.1) + `rotinaPropostaSchema` (10 campos) + `rotinasPropostasLoteSchema`
  (cardinalidade EXATA de 3). `packages/domain/src/modo-rotina-state.ts`
  (`canTransitionRotinaNormativa`). **Disclosure**: os 10 campos exatos
  não existem em nenhuma fonte acessível a esta sessão (mesma lacuna do
  nome "Modo Rotina" em si, já registrada na Fase 0) — são uma proposta
  autorada nesta fase, documentada como tal no próprio arquivo, e não
  fecham D10. Deliberadamente uma máquina/enum SEPARADOS de
  `RoutineStatus` (packages/schemas/src/routine.ts) — ver o comentário do
  arquivo para por que as duas não foram fundidas.
- **Aceite (negativos explícitos)**:
  - ✅ `tenant_id` forjado no argumento é ignorado — verdadeiro por
    construção desde a Fase 2 (nenhuma tool MCP tem `workspaceId` no seu
    schema de input; vem só do closure). Não há teste novo além do que
    a Fase 2 já cobre, porque não há caminho de código que aceitaria um
    `workspaceId` de argumento para negar.
  - ✅ Execução repetida do cron gera **um** `RoutineRun` — já garantido
    desde M10 pelo `@@unique` em `RoutineRun.runKey`
    (`packages/database/prisma/schema.prisma`); confirmado nesta fase,
    não implementado agora.
  - ⚠️ `executar-scanner não consegue gravar` — não testável literalmente
    (a tool não existe); testado na forma mais forte "nenhuma tool fora
    da allowlist executa" (`__tests__/hooks.test.ts`).
  - ⚠️ "Nenhuma rotina chega a Ativo sem confirmação humana" — a máquina
    normativa (`canTransitionRotinaNormativa`) é uma estrutura pura, sem
    dimensão de `actor` (ver o comentário do próprio arquivo: a
    confirmação é responsabilidade de quem chama, não desta função) —
    **não há ainda um caller real** (isso nasce só na Fase 5, quando o
    orquestrador determinístico existir) para testar esse negativo
    ponta a ponta. Registrado como pendente, não fabricado.
  - Todos os testes novos de hooks (`PreToolUse`) são testes puros sobre
    o `HookCallback` — não verificados contra uma sessão real do Agent
    SDK nesta sessão sandbox (mesma limitação disclosurada na Fase 3).

## Fase 5 — Jornada de ativação e 1º entregável — ✅ EXECUTADA (parcialmente verificável)

- **Entrada**: Fases 1 e 3 aceitas (contratos + runtime real disponíveis).
- **Trabalho real**: `packages/domain/src/ativacao-orchestrator.ts`
  (`advanceFaseAtivacao`) — o orquestrador puro, determinístico, sem I/O:
  valida a transição estrutural (`canTransitionFaseAtivacao`, Fase 1) e o
  payload da fase de origem contra o schema daquela fase.
  `apps/copiloto-runtime/src/ativacao.ts` (`runFaseAtivacao`) conecta esse
  orquestrador a uma chamada real de `query()` com
  `outputFormat: {type:'json_schema', schema: z.toJSONSchema(...)}` por
  etapa, e ao `POST /ativacao/avancar` em `server.ts`. Dois schemas novos
  em `packages/schemas/src/ativacao.ts` para completar as 6 fases não
  terminais: `backlogInicialSchema` (saída de PRODUCTIVITY) e
  `primeiroEntregavelSchema` (saída de PRIMEIRO_ENTREGAVEL).
- **Disclosure sobre o "template oficial único"**: o template real do
  Blueprint não está acessível a esta sessão (mesma limitação da Fase 0).
  `primeiroEntregavelSchema` é uma reconstrução a partir da própria frase
  do plano ("consolida onboarding + scanner + backlog + configuração
  operacional + status + 3 rotinas + próximos passos"), documentada como
  tal no arquivo — não uma cópia do template real. Se o template real
  existir em outro lugar, este schema deve ser substituído, não ajustado
  ao redor dele.
- **Aceite — "Operations não inicia sem saída válida de Productivity"**:
  ✅ verificado com teste real, sem mock, no orquestrador puro
  (`packages/domain/__tests__/ativacao-orchestrator.test.ts`): um handoff
  `PRODUCTIVITY→OPERATIONS` com `payload` inválido é rejeitado por
  `advanceFaseAtivacao` antes de qualquer chamada ao SDK. Este é o
  aceite mais forte possível sem depender de infraestrutura externa —
  a mesma função que `runFaseAtivacao` chama depois de uma `query()`
  real.
- **Aceite — "entregável valida contra schema oficial único"**: ✅
  verificado estruturalmente (`packages/schemas/__tests__/
  primeiro-entregavel.test.ts`) contra o schema autorado nesta fase —
  não contra o template real do Blueprint, pela limitação já disclosurada.
- **Não verificado nesta sessão sandbox**: a integração ponta a ponta
  `runFaseAtivacao` → `query()` real → `structured_output` → 
  `advanceFaseAtivacao` (sem `ANTHROPIC_API_KEY`, só os caminhos de erro
  anteriores à chamada real do SDK são testados —
  `apps/copiloto-runtime/__tests__/ativacao.test.ts`).

## Fase 6 — Skills pt-BR, rotas e UI

- **Entrada**: `D7` (status report canônico) decidido — senão
  `executar-status-report` não tem o que traduzir.
- **Trabalho**: `packages/copiloto-skills` (fork/tradução de
  Productivity/Operations); renomear rotas pt-BR (C15) com mapa
  `anterior→novo` + redirects.
- **Aceite**: fluxo completo operável por usuário autenticado; nenhuma
  rota pública com placeholder.

## Fase 7 — Scroll Task (`APP-SCR-001`)

- **Entrada**: nenhuma dependência das fases anteriores além de
  `@repo/application` (já existe e testado).
- **Trabalho**: tela 33/33/33, estados
  `idle|running|expanded|completed|deferred|timer_elapsed`.
- **Aceite**: auto-scroll nunca marca conclusão automaticamente; usuário
  inicia execução em ≤2 interações.
- **Observação**: esta fase é a mais independente do grafo — poderia, em
  princípio, ser adiantada antes da Fase 2/3 se o usuário priorizar
  entrega de UI sobre migração de SDK. Não é a ordem recomendada pelo
  plano original, mas é uma opção real dado que não há aresta de
  dependência.

## Fase 8 — Scanner Visual (`APP-VIS-001`), fecha `REC-006`

- **Entrada**: acesso a um device físico (ou simulador com ONNX runtime
  real) — não disponível nesta sessão sandbox.
- **Trabalho**: `session.run()` real contra `dinov2_vits14.onnx`; símbolos
  seed; benchmark p95.
- **Aceite**: benchmark real registrado **ou** a meta é explicitamente
  reclassificada como não atingida — nunca declarada verificada sem
  medição real (regra já no plano, reforçada aqui porque `dinov2-encoder.ts`
  já documenta essa lacuna em comentário próprio).

## Fase 9 — Observabilidade, evals, rollout, fecha `REC-005`

- **Entrada**: Fases 3–4 estáveis (precisa do container rodando para OTEL
  fazer sentido).
- **Trabalho**: OTEL, ampliar evals, corrigir env vars Vercel (`REC-005` —
  ação humana, listada em `LAUNCH_RUNBOOK.md` §2), feature flag
  `showCopiloto`.
- **Rollback**: desligar a flag; nenhuma migration é revertida.

## Ordem recomendada vs. ordem obrigatória

Obrigatório: 1 antes de 5; 2 antes de 3; 3 antes de 5; 1 antes de 4 (Modo
Rotina referencia contratos). Flexível: 6, 7, 8 podem ser reordenadas entre
si e com 4, conforme prioridade do usuário — nenhuma delas é pré-requisito
técnico de outra, só de decisões (D7 para 6, device físico para 8).
