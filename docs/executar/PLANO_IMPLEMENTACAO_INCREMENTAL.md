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

## Fase 6 — Skills pt-BR, rotas e UI — ✅ EXECUTADA (escopo reduzido, disclosurado)

Executada sem esperar D7 (segue `DECISAO_REQUERIDA`) — ver disclosure
abaixo sobre por que isso não bloqueou o trabalho real desta fase.

- **Descoberta real desta fase**: os plugins `productivity` (v1.3.1) e
  `operations` (v1.3.0) citados no plano existem de fato — confirmados
  via `SearchPlugins` nesta própria sessão, com as versões batendo
  exatamente com o que o plano já citava. Mas **esta sessão não tem
  nenhuma ferramenta que leia o conteúdo completo (SKILL.md) desses
  plugins** — `SearchPlugins`/`ListPlugins` só devolvem metadados (nome,
  descrição, lista de nomes de skill: `productivity:start`,
  `productivity:task-management`, `operations:status-report`, etc.).
  Portanto **D5 ("forkar e traduzir") não pôde ser executado
  literalmente** — não há texto-fonte para traduzir a partir desta
  sessão.
- **O que foi feito em vez disso**: `packages/copiloto-skills/`
  (`.claude-plugin/plugin.json` + `skills/executar-{onboarding,scanner,
  backlog,modelo-operacional,modo-rotina,primeiro-entregavel}/SKILL.md`)
  — 6 skills em pt-BR, **conteúdo original desta implementação**, cada
  uma grounded no domínio real já construído nas Fases 1-5
  (`packages/schemas/src/ativacao.ts`, `modo-rotina.ts`,
  `packages/domain`), não uma tradução do plugin Anthropic. Cada
  SKILL.md disclosura essa limitação explicitamente no próprio arquivo,
  primeira seção. Conectadas ao runtime real via
  `apps/copiloto-runtime/src/ativacao.ts`'s `plugins: [{type:'local',
  path: ...}]` (a opção que o plano já pedia, "não via settingSources").
- **D7 não bloqueou porque**: nenhuma das 3 candidatas a
  `executar-status-report` (base/Business Pack/operations) está
  acessível para comparação nesta sessão de qualquer forma — a skill
  `executar-status-report` simplesmente não foi criada nesta fase
  (não está na lista acima), em vez de ser criada às cegas contra uma
  fonte inacessível. Registrar como trabalho pendente, não fabricado.
- **C15 (rotas pt-BR)**: `/copilot` → `/copiloto` renomeado de verdade
  — `git mv` do diretório de rota, link do sidebar atualizado, redirect
  308→ em `apps/app/next.config.ts` (`/copilot` → `/copiloto`,
  `permanent: false`). Só esta uma rota, deliberadamente — renomear as
  ~10 restantes (`/now`, `/reports`, `/projects`, `/automations`,
  `/workflows`, `/integrations`, `/sprint`, `/roadmap`, `/calendar`,
  `/overview`) na mesma sessão sem tempo de verificar cada uma
  individualmente teria sido mais risco que valor. Mapa completo
  `anterior → novo` fica como próximo passo real, não uma lista
  inventada:

  | Rota atual (inglês) | Rota pt-BR proposta |
  |---|---|
  | `/copilot` | `/copiloto` ✅ feito nesta fase |
  | `/now` | `/agora` |
  | `/reports` | `/relatorios` |
  | `/projects` | `/projetos` |
  | `/automations` | `/automacoes` |
  | `/workflows` | `/fluxos` |
  | `/integrations` | `/integracoes` |
  | `/sprint` | `/sprint` (sem tradução natural — manter) |
  | `/roadmap` | `/roadmap` (idem) |
  | `/calendar` | `/calendario` |
  | `/overview` | `/visao-geral` |
  | `/today`, `/tomorrow`, `/yesterday` | `/hoje`, `/amanha`, `/ontem` |

- **UI da ativação (apps/app e apps/mobile)**: **não feita nesta fase**
  — não há ainda nenhuma tela consumindo `POST /ativacao/avancar`
  (Fase 5). Construir essa UI antes de haver um backend real testado
  contra Postgres/ANTHROPIC_API_KEY reais arriscaria UI sem contrato
  verificado por trás. Registrado como trabalho da próxima sessão.
- **Aceite do plano ("fluxo completo operável", "nenhuma rota pública
  com placeholder")**: **não alcançado integralmente** — disclosurado,
  não maquiado. O que está feito: a rota renomeada funciona (typecheck
  + lint verdes); os 12 pacotes de teste seguem verdes. O que falta:
  UI de ativação, as ~10 rotas restantes, e a skill
  `executar-status-report` (bloqueada por D7 real, não por preguiça).

## Fase 7 — Scroll Task (`APP-SCR-001`) — ✅ EXECUTADA

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

- **Camada pura (schema + domain)**: `packages/schemas/src/scroll-task.ts`
  (`scrollTaskScopeSchema`, `scrollTaskStateSchema`,
  `scrollTaskTimerMinutesSchema` limitado a `15|30|45`,
  `scrollTaskUnitSchema`, `SCROLL_TASK_TRANSITIONS`) e
  `packages/domain/src/scroll-task-state.ts`
  (`canTransitionScrollTask`, `onTimerElapsed`) — mesmo padrão de
  máquina de estado pura já usado em `ativacao-state.ts` e
  `modo-rotina-state.ts`. 8 + 18 testes, todos verdes.
- **Regra "auto-scroll nunca marca conclusão automaticamente"**: não dá
  para expressar isso só como restrição na tabela de transição —
  estruturalmente `timer_elapsed → completed` É legal, porque o
  *usuário* pode concluir depois que o timer estourou. A regra real é
  sobre quem chama a transição: `onTimerElapsed` existe justamente para
  o cronômetro em si só poder produzir `timer_elapsed`, nunca chamar
  `completed` diretamente. Isso está testado tanto no nível de domínio
  (`scroll-task-state.test.ts`, describe dedicado a essa garantia)
  quanto no componente (`scroll-task-view.test.tsx`: o único caminho de
  código que produz `completed` é o clique explícito em "Concluir").
- **UI real**: `apps/app/app/(authenticated)/scroll/page.tsx` (server
  component, busca tarefas elegíveis via `rankEligibleTasks` —
  **a mesma fonte de dados real que `/now` e `/sprint` já usam**, não
  um mock) + `scroll-task-view.tsx` (client component com o layout
  33/33/33, cronômetro, duplo toque para expandir, botões
  Concluir/Adiar). "Inicia execução em ≤2 interações" verificado
  literalmente: idle → running é 1 clique no botão "Iniciar".
- **Teste do componente**: `apps/app/__tests__/scroll-task-view.test.tsx`
  (7 testes com `@testing-library/react`) cobre: layout com unidade
  ativa central, estado vazio, "Iniciar" em 1 clique, conclusão avança
  para a próxima unidade, adiar idem, duplo clique expande (só depois
  de iniciado — de `idle` não há transição direta pra `expanded`, então
  o teste inicia primeiro), e nenhum botão "Concluir" visível em estado
  `idle`. Descoberta ao escrever este teste: `apps/app/vitest.config.ts`
  não habilita `test.globals`, então o auto-cleanup do
  `@testing-library/react` (que depende de detectar um `afterEach`
  global) não disparava sozinho — DOM de um teste vazava pro próximo.
  Corrigido com `afterEach(cleanup)` explícito no arquivo de teste; não
  é uma mudança de config global, só o teste novo se protegendo.
- **Verificação real**: `bunx ultracite check .` limpo (0 erros);
  `bun run typecheck` — 38/38 tasks; `bun run test` — 19/19 tasks (as 3
  suítes de `apps/app` incluindo a nova, 9/9 testes; repo inteiro sem
  regressão).
- **Fora de escopo v1 (disclosurado no próprio JSDoc do componente, não
  escondido)**: timer adaptativo por IA, reordenação completa das
  unidades por prioridade dinâmica, e qualquer conclusão automática por
  tempo — nenhum dos três está implementado, de propósito, e nenhum
  estava no aceite desta fase.
- **Não verificado nesta sessão**: comportamento em navegador real
  (E2E/Playwright) — só verificado via jsdom (`@testing-library/react`).
  A regra de negócio ("nunca completa sozinho") está testada tanto no
  domínio quanto no componente, mas isso não substitui um teste E2E
  real; registrar como próximo passo se a UI for para produção.

## Fase 8 — Scanner Visual (`APP-VIS-001`), fecha `REC-006` — ⚠️ NÃO ATINGIDA (reclassificada, conforme o próprio aceite da fase)

- **Entrada**: acesso a um device físico (ou simulador com ONNX runtime
  real) — não disponível nesta sessão sandbox.
- **Trabalho**: `session.run()` real contra `dinov2_vits14.onnx`; símbolos
  seed; benchmark p95.
- **Aceite**: benchmark real registrado **ou** a meta é explicitamente
  reclassificada como não atingida — nunca declarada verificada sem
  medição real (regra já no plano, reforçada aqui porque `dinov2-encoder.ts`
  já documenta essa lacuna em comentário próprio).

- **Auditoria real feita nesta fase**: leitura direta de todo o pipeline
  (`packages/scanner/src/{types,registry,recognize,event-latch,dispatch,
  telemetry}.ts`, `apps/mobile/src/features/scanner/vision/{dinov2-
  encoder,model-store,scanner-pipeline}.ts`,
  `apps/mobile/app/(tabs)/scanner.tsx`, `apps/mobile/scripts/fetch-
  model.ts`, `apps/api/app/scanner/{dispatch,undo,symbols}/route.ts`).
  Confirmado: **todo o trabalho determinístico do Scanner Visual já
  estava implementado antes desta sessão** (PR base, não trabalho das
  Fases 1-7) — os 3 símbolos seed
  (`SYM-CHAT-001→OPEN_CHAT`, `SYM-SELECTOR-001→OPEN_SELECTOR`,
  `SYM-DONE-001→COMPLETE_LATEST_OPEN_TASK`), o latch edge-triggered
  (`ABSENT→ENTER→FIRED→PRESENT`, sem tela de confirmação),
  `dispatch()`/`undo(mutationId)` com transação real (`Task` +
  `Evidence` + `AuditEvent` + `ScannerMutation`), e a tela real do
  scanner no mobile já ligando câmera → `runScanTick` → dispatch →
  undo. `bunx turbo run test --filter=@repo/scanner`: 41 testes
  passando, 8 pulados (mesma convenção `describe.skipIf(!DATABASE_URL)`
  das demais fases) — idêntico ao número já citado em
  `MATRIZ_FONTE_REQUISITO_CODIGO.csv` na Fase 0, ou seja, **sem
  regressão e sem trabalho novo necessário nessa camada**.
- **O único item real em aberto**: `session.run()` contra o
  `dinov2-vits14.onnx` de verdade, com benchmark p95 `scan→action` em
  device. Bloqueado por uma cadeia de dependências externas que esta
  sessão não pode criar: (1) nenhuma URL/SHA-256 real do modelo existe
  em nenhum lugar do corpus ou desta sandbox (`scripts/fetch-model.ts`
  e `model-store.ts` já documentam isso em comentário próprio,
  confirmado por leitura direta nesta fase, não repetido às cegas);
  (2) mesmo com o arquivo em mãos, rodar `onnxruntime-react-native`
  exige um device físico ou simulador com runtime nativo — este
  ambiente é um container Linux sandbox sem Expo/React Native runtime
  nem câmera.
- **Decisão desta fase**: em vez de fabricar um número de latência ou
  simular `session.run()` com um "modelo" falso (o que violaria
  diretamente a regra de proveniência deste projeto — nunca declarar
  algo verificado sem medição real), **a meta de benchmark é
  explicitamente reclassificada como não atingida**, exatamente como o
  próprio aceite da fase previa como resultado legítimo. Isso fecha a
  auditoria de Fase 8 nesta sessão sem fechar `REC-006` — `REC-006`
  continua aberto e agora tem um dono claro: obtenção de um release
  real do modelo (URL + SHA-256) e execução em device físico/simulador
  com ONNX real, ambos fora do alcance de uma sessão sandbox.
- **Nenhum código foi alterado nesta fase** — a auditoria confirmou que
  não havia lacuna de implementação para fechar, só a lacuna de
  medição já conhecida.

## Fase 9 — Observabilidade, evals, rollout, fecha `REC-005` — ✅ EXECUTADA (parcialmente — `REC-005` continua ação humana)

- **Entrada**: Fases 3–4 estáveis (precisa do container rodando para OTEL
  fazer sentido).
- **Trabalho**: OTEL, ampliar evals, corrigir env vars Vercel (`REC-005` —
  ação humana, listada em `LAUNCH_RUNBOOK.md` §2), feature flag
  `showCopiloto`.
- **Rollback**: desligar a flag; nenhuma migration é revertida.

- **`mirror_error` (lacuna real deixada em aberto na Fase 3, agora
  fechada)**: `apps/copiloto-runtime/src/session-store.ts`'s `append()`
  nunca tinha tratamento de erro — uma falha na gravação (o "mirror" do
  transcript da sessão do Agent SDK) simplesmente propagava sem nenhum
  sinal greppable/alertável. Agora envolvido em `try/catch`:
  `console.error("mirror_error", {workspaceId, projectKey, sessionId,
  subpath, error})` antes de relançar — este container é um app Bun
  puro, não Next.js, então `@repo/observability`'s `error.ts`/`log.ts`
  (que dependem de `@sentry/nextjs`/`@logtail/next`) não são a escolha
  certa aqui; `console.error` para o stdout/stderr do próprio container
  é o substrato de alerta real e sem dependência nova que este app
  já tem hoje. Testado com um novo `__tests__/mirror-error.test.ts`
  (mock de `@repo/database`, sem depender de Postgres real): confirma
  que a falha é logada com a tag e que a rejeição original ainda
  propaga, e que um batch vazio nunca toca o DB nem alerta.
- **OTEL — exposto, não verificado**: `apps/copiloto-runtime/env.ts`
  ganhou `CLAUDE_CODE_ENABLE_TELEMETRY`/`OTEL_METRICS_EXPORTER`/
  `OTEL_LOGS_EXPORTER`/`OTEL_EXPORTER_OTLP_{PROTOCOL,ENDPOINT,HEADERS}`
  como config validada e tipada — todos opcionais, nada habilitado por
  padrão. Essas variáveis são lidas diretamente pelo subprocesso da CLI
  do Claude Code, não pelo código deste app; `src/tenant.ts`'s
  `env: {...process.env, ...}` já as encaminha para toda chamada
  `query()` sem nenhuma mudança de código adicional — o que esta fase
  de fato adicionou foi um lugar único, documentado e validado por
  schema para essa superfície de configuração, não a canalização em si
  (que já existia). **Não verificado nesta sessão**: nenhum coletor
  OTLP real existe neste sandbox para confirmar que um span de verdade
  chega a algum lugar — isso só é verificável com um coletor real em um
  deploy real.
- **Evals ampliados**: os 3 arquivos (`evals/{datasets/golden,
  regression/regression,adversarial/adversarial}.jsonl`) cobriam só o
  contrato `orchestratorOutputSchema` (Camada 2). `gradeSchema`
  (`packages/agent-runtime/src/evals/graders.ts`) agora despacha por
  prefixo de `capability` — `ativacao.*` → `handoffEnvelopeSchema`,
  `modo_rotina.*` → `rotinasPropostasLoteSchema`, `scroll_task.*` →
  `scrollTaskUnitSchema`, qualquer outro prefixo mantém
  `orchestratorOutputSchema` (sem mudança de comportamento para os 18
  casos pré-existentes). 7 casos novos, um por combinação
  golden/regression/adversarial × contrato onde fazia sentido: um
  handoff legal (golden) vs. um que pula fase (`ONBOARDING→OPERATIONS`,
  adversarial) vs. `producedAt` não-ISO (regression); um lote de
  exatamente 3 `RotinaProposta` (golden) vs. um lote de 1 (regression)
  vs. um lote de 4 injetando uma quarta automação (adversarial); uma
  `ScrollTaskUnit` válida (golden). `bunx vitest run evals` (`packages/
  agent-runtime`): 25 passando (18 originais + 7 novos), 1 pulado
  (o caso `LIVE-ADV-001` já existente, `describe.skipIf(DATABASE_URL)`).
- **`showCopiloto` — rollout tenant a tenant real**: `export const
  showCopiloto = createFlag("showCopiloto")` (`packages/feature-flags/
  index.ts`), o mesmo `createFlag()` (PostHog `isFeatureEnabled(key,
  userId)`, padrão já usado por `showBetaFeature`) — rollout por
  usuário real via o dashboard do PostHog, não um boolean fixo no
  código. Fecha duas portas, não uma: `components/sidebar.tsx` filtra o
  item "Copiloto" do menu quando a flag está desligada (`GlobalSidebar`
  ganhou a prop `copilotoEnabled`, resolvida server-side em
  `layout.tsx`), e `copiloto/page.tsx` chama `notFound()` (mesma
  convenção já usada por `webhooks/page.tsx`) quando a flag está
  desligada — só esconder o link no menu não impediria acesso direto
  pela URL. Default `false` (o default do próprio `createFlag`): a
  feature não vaza para ninguém até ser explicitamente ligada por
  tenant.
- **`REC-005` (env vars Vercel) — continua ação humana, não fechado
  nesta fase**: confirmado por leitura direta de `LAUNCH_RUNBOOK.md`
  §2 ("Vercel projects — DONE (env vars still 🧑 manual)") que a lacuna
  é exatamente a mesma da Fase 0 — populaar as env vars no dashboard
  Vercel é uma ação que exige credenciais reais de um humano com acesso
  à conta Vercel, não algo que uma sessão de código pode ou deve tentar
  fazer. Nenhuma tentativa de simular ou contornar isso foi feita.
- **Verificação real**: `bunx ultracite check .` 0 erros; `bun run
  typecheck` 38/38 pacotes; `bun run test` 19/19 pacotes — incluindo os
  2 testes novos de `mirror-error.test.ts` e os 7 casos de eval novos.

## Ordem recomendada vs. ordem obrigatória

Obrigatório: 1 antes de 5; 2 antes de 3; 3 antes de 5; 1 antes de 4 (Modo
Rotina referencia contratos). Flexível: 6, 7, 8 podem ser reordenadas entre
si e com 4, conforme prioridade do usuário — nenhuma delas é pré-requisito
técnico de outra, só de decisões (D7 para 6, device físico para 8).
