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

## Fase 3 — Runtime containerizado (risco alto, muda topologia)

- **Entrada**: Fase 2 aceita e estável.
- **Trabalho**: novo `apps/copiloto-runtime` (Dockerfile, `POST /sessoes`,
  SSE, `SessionStore`→Postgres); `apps/api/app/copilot/command/route.ts`
  passa de chamada in-process para proxy HTTP pré-autenticado — **esta é a
  mudança de topologia identificada em `GRAFO_DEPENDENCIAS.md` §2/§3**.
- **Risco**: alto — muda o comportamento de uma rota já em produção
  (mesmo que só testada, não deployada).
- **Aceite**: `query()` ponta a ponta contra o container; reiniciar o
  container e `resume` da mesma sessão preserva contexto (prova real do
  `SessionStore`, não assumida); `copilot-command.test.ts` adaptado (não
  apenas mantido — a topologia mudou, então o teste precisa mockar a nova
  chamada HTTP, e isso deve ser declarado explicitamente no PR, não
  silenciado).

## Fase 4 — Tools, hooks, permissões e Modo Rotina

- **Entrada**: `D9a` (consentimento das 12 tools reais) decidido;
  `D10` (fuso/retry/notificação) decidido.
- **Trabalho**: tools MCP in-process com `tenant_id` no closure (não no
  argumento do modelo); hooks `PreToolUse`/`PostToolUse`/etc.; Modo Rotina
  como máquina nomeada sobre `packages/routines`.
- **Aceite (negativos explícitos, como o plano já exige)**:
  `executar-scanner` não consegue gravar; nenhuma rotina chega a `Ativo`
  sem `EventoAuditoria` de confirmação humana; `tenant_id` forjado no
  argumento é ignorado; execução repetida do cron gera **um** `RoutineRun`.

## Fase 5 — Jornada de ativação e 1º entregável

- **Entrada**: Fases 1 e 3 aceitas (contratos + runtime real disponíveis).
- **Trabalho**: orquestrador determinístico da Camada 1,
  `outputFormat: {type:'json_schema'}` por etapa.
- **Aceite**: Operations não inicia sem saída válida de Productivity
  (teste negativo); entregável valida contra schema oficial único.

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
