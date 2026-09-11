# Plano — Executar App / Agente Copiloto no Turborepo next-forge

| Campo | Valor |
|---|---|
| **ID** | `PLANO-EXECUTAR-COPILOTO-001` |
| **Status** | **APROVADO PELO USUÁRIO — NÃO EXECUTADO** |
| **Aprovado em** | 2026-09-11 |
| **Base de código** | `claude/trusting-pasteur-w4jzf1` (PR [#1](https://github.com/Sas-Executar/next-forge/pull/1), draft) |
| **Executor** | Uma sessão futura. Ver `PROMPT_ATIVACAO_SESSAO.md` nesta mesma pasta |
| **Origem** | Pacote `EXECUTAR_APP_GOVERNANCA_PLAN_HANDOFF` (640 arquivos) + inspeção do repositório real |

> **Nada foi implementado.** Nenhum código alterado, nenhuma dependência instalada, nenhuma migração executada.
> A sessão que produziu este plano encerrou após a aprovação, conforme o gate P4 do handoff.
> Conteúdo humano em pt-BR; novas skills/ações canônicas com prefixo `executar-*`.

**Leia antes:** `HANDOFF.md` na raiz do repositório (continuidade da sessão que construiu o PR #1),
`PRODUCT_AUDIT.md` (tabela de milestones M00–M21) e `LAUNCH_RUNBOOK.md` (🤖 feito vs. 🧑 manual).

---

## 1. Contexto — por que esta mudança

O pacote `EXECUTAR_APP_GOVERNANCA_PLAN_HANDOFF` (640 arquivos, 22 MB) declara-se `PRONTO_PARA_PLANEJAMENTO` e **`status_contratual: NAO_APROVADO`**: é corpus de entrada, não arquitetura aprovada. O objetivo desta fase é convertê-lo em plano executável sobre o Turborepo real, preservando as decisões funcionais confirmadas e expondo — nunca fechando silenciosamente — conflitos e decisões pendentes.

**A descoberta central desta análise reorienta todo o trabalho:** o repositório de destino **já contém uma implementação substancial e testada** do Executar App, não mergeada (PR #1, draft). O plano deixa de ser "construir do zero" e passa a ser **"auditar, reconciliar e completar o que existe"** — que é exatamente o que a regra PLAN-02 do handoff exige ("Inspecionar o Turborepo real e confrontar estrutura, stack e estado atual").

---

## 2. Especialidade ativada (exigência 1 do pedido)

| Item | Resultado |
|---|---|
| Skill ativada | **`/claude-api`** (skill nativa do Claude Code, presente no ambiente) |
| Limitação declarada pela própria skill | *"This skill covers the Claude API and Managed Agents (options 1–3); **it does not generate Claude Agent SDK code**."* |
| Ação corretiva | Consulta à **documentação oficial atual do Claude Agent SDK** (`code.claude.com/docs/en/agent-sdk/`: overview, typescript, subagents, hooks, permissions, sessions, custom-tools, skills, hosting, quickstart) + registro npm |
| Versão aplicável | **`@anthropic-ai/claude-agent-sdk@0.3.268`** · `engines.node >= 18` · **zero dependências de runtime** · binário nativo do Claude Code via `optionalDependencies` por plataforma |

Nenhum contrato de Agent SDK foi improvisado: cada afirmação de API abaixo vem da doc oficial ou do registro npm.

**Recursos que orientam o plano:** `query()` · `agents` (subagentes: `description`/`prompt`/`tools`/`disallowedTools`/`model`/`maxTurns`/`skills`/`permissionMode`) · `tool()` + `createSdkMcpServer()` (tools Zod in-process, nome `mcp__<server>__<tool>`) · `hooks` (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SessionStart/End`, `Stop`, `SubagentStart/Stop`, `PermissionRequest`) · `permissionMode` + `allowedTools`/`disallowedTools` + `canUseTool` · sessões (`resume`/`forkSession`/`sessionStore`) · `plugins` (skills/agents/hooks por caminho local) · `settingSources` · `outputFormat:{type:'json_schema'}` · `maxBudgetUsd`/`maxTurns`.

**Restrição de hospedagem (doc oficial, decisiva):** *"The Agent SDK spawns and supervises a `claude` CLI subprocess that owns a shell, a working directory, and session files on disk. Hosting it is not like hosting a stateless API wrapper."* Recursos sugeridos: **1 GiB RAM, 5 GiB disco, 1 CPU por agente**; transcripts em `~/.claude/projects/`; **sem timeout de sessão**. ⇒ **Não roda em função serverless da Vercel.**

---

## 3. Diagnóstico do repositório — dois estados distintos

### 3.1 `main` (base atual da minha branch `claude/lucid-galileo-3jnpad`)
`next-forge@6.0.2` puro, upstream. `packages/database` com **um único modelo `Page`** (stub), `packages/ai` é wrapper fino (`export * from "ai"` + OpenAI `gpt-4o-mini`), sem `.claude/`, sem `apps/mobile`, sem `packages/mcp`. Cron apenas `keep-alive`.

### 3.2 `claude/trusting-pasteur-w4jzf1` — **PR #1**, aberto, draft, 461 arquivos
`feat: M00-M21 — EXECUTAR on next-forge, full plan + launch infra` · base `main` · [PR #1](https://github.com/Sas-Executar/next-forge/pull/1)

| Camada | Estado real no branch |
|---|---|
| **Banco** | `schema.prisma` com **~37 modelos/enums**: `Workspace`, `Membership`, `Project`, `Process`, `Deliverable`, `Task`, `Action`, `Evidence`, `Dependency`, `Routine`, `RoutineRun`, `WorkflowDefinition`, `WorkflowRun`, `StatusReport`, `MapaOS`, `VisualSymbol`, `ScannerMutation`, `IntegrationConnection`, `ExternalObjectRef`, `AgentRun`, `ToolCall`, `AIUsage`, `TelemetryEvent`, `Attachment` + enums `TaskState`, `RoutineStatus`, `RunStatus`, `EvidenceGrade`, `BehaviorAuthority`, `VisualCommand`, `ActorType`… |
| **Packages novos** | `agent-runtime`, `domain`, `application`, `schemas`, `routines`, `automation`, `mapa-os`, `reports`, `scanner`, `mcp`, `integrations`, `billing`, `design-tokens` |
| **`@repo/agent-runtime`** | 25 arquivos **com testes**. Comandos `bomdia`/`agora`/`estado`/`fechardia`/`replanejamento`; `phases.ts`, `output-schema.ts`, `format.ts`, `prompts/system.ts`, `tools.ts`, `evals/graders.ts`. **Depende de `ai@^6.0.116` (Vercel AI SDK) + `zod@^4.3.6`** |
| **Agent SDK** | **`@anthropic-ai/claude-agent-sdk` não aparece em nenhum arquivo do branch** |
| **Fluxo implementado** | `AGENT_FLOW_PHASES` = `SYNC → UNDERSTAND → STRUCTURE → VISUALIZE → PRE_APPROVE → DECOMPOSE → EXECUTE → RECONCILE → REPORT → REPLAN` (`AGENT-FLOW-001`), com gate `REPLAN_RETURNS_TO = "VISUALIZE"` |
| **`apps/api`** | `copilot/command`, `cron/routines`, `mapa-os`, `mcp`, `now`, `now/advance`, `projects`, `reports`, `reports/generate`, `scanner/{dispatch,symbols,undo}`, `webhooks/{gmail,outlook,whatsapp,auth,payments}`, `notifications/register-device` |
| **`apps/app`** | 23 páginas autenticadas: `copilot`, `mapa-os`, `now`, `today/tomorrow/yesterday`, `projects`, `reports`, `roadmap`, `sprint`, `workflows`, `automations`, `calendar`, `integrations`, `settings/{billing,privacy}`, `admin/dashboard` + `api/chat`, `api/mapa-os/print`, `api/integrations/{gmail,outlook}`, `api/privacy/export` |
| **`apps/mobile`** | 50 arquivos, Expo Router: `(auth)`, `(tabs)/{index,copilot,mapa-os,projects,reports,scanner}` |
| **Evals** | `evals/datasets/golden.jsonl`, `evals/regression/regression.jsonl`, `evals/adversarial/adversarial.jsonl` |
| **Governança no repo** | `AGENTS.md`, `QUALITY_GATES.md`, `HANDOFF.md`, `INFRASTRUCTURE.md`, `LAUNCH_RUNBOOK.md`, `PRODUCT_AUDIT.md` |

**Convenções do repositório (valem para todo package novo):** sem build step e sem campo `exports` — TS cru resolvido por path alias `@repo/* → ../../packages/*`; cada package tem `keys.ts` (Zod + `@t3-oss/env-nextjs`) registrado no `env.ts` de cada app; `package.json` com `private`, `version:"0.0.0"`, scripts `clean`/`typecheck`/`test`; `tsconfig.json` estendendo `@repo/typescript-config/nextjs.json`. Vitest 4; `turbo.json` tem `build dependsOn ["^build","test"]`, então adicionar script `test` coloca o package no gate de build. Biome via `ultracite` (`bun run check` / `bun run fix`).

---

## 4. Decisões tomadas nesta sessão (aprovadas pelo usuário)

| # | Decisão | Escolha |
|---|---|---|
| **D1** | Base do trabalho | **Partir do PR #1** (`claude/trusting-pasteur-w4jzf1`), não do `main` |
| **D2** | SDK do agente | **Migrar tudo para o Claude Agent SDK** — runtime containerizado fora da Vercel |
| **D3** | Conflito de sequência | **Duas camadas distintas, conciliadas**: Visão Normativa = jornada de ativação (uma vez por tenant); `AGENT-FLOW-001` = ciclo operacional recorrente. Exige mapa explícito + ADR |
| **D4** | Fonte canônica (SOT) | **Postgres do app** (`@repo/database`). Drive/Linear viram `FonteAutorizada` somente-leitura com proveniência |
| **D5** | Productivity/Operations | **Forkar e traduzir como skills `executar-*` pt-BR** |
| **D6** | Escopo da entrega 1 | **Copiloto + Scroll Task (`APP-SCR-001`) + Scanner Visual (`APP-VIS-001`)** |

---

## 5. Classificação das fontes (regra §6 do pedido)

### 5.1 CONFIRMADO
- **`GOV-LNG-001`** — pt-BR em todo conteúdo humano novo + namespace verbal `executar` (único item marcado "Regra confirmada" na governança).
- Destino é o Turborepo existente; **não criar repositório paralelo**.
- Modo Plan até aprovação humana explícita (gate P4).
- **Visão Sistêmica Normativa** (declarada pelo usuário como decisão funcional, a não reinterpretar): sequência `Onboarding → Scanner → Productivity → Operations → Modo Rotina → 1º Entregável → Operação contínua`; metodologia de 8 passos (Capturar · Interpretar · Estruturar · Priorizar · **Confirmar** · Executar · Monitorar · Adaptar); **Productivity obrigatoriamente antes de Operations**; Scanner **não decide automaticamente**; máquina `Proposto → Confirmado → Ativo ⇄ Pausado`, `Ativo → Revisao → Ativo`; 10 campos obrigatórios por rotina; **nenhuma rotina ativa sem confirmação**; **exatamente 3** automações sugeridas; **primeiro entregável único**, só com o template oficial já fornecido.
- **Neon + Prisma** como camada de dados (`AGENTS.md` do repo proíbe Supabase sem ADR de supersessão; `REC-001`).
- **ACTION UNIT > PLAN-CARD-5X** — fechado na fonte (`MTD-001 CANONICO` vs `MTD-003 LEGADO_SUPERADO`); a governança ainda lista como conflito #8 a confirmar.
- Estados canônicos do Copiloto: `BACKLOG_VALIDATED → READY → DOING → VERIFY → DONE` + `BLOCKED`; rótulos pt-BR só na UI — *"Não alterar o estado canônico apenas para traduzir a interface."*
- **WIP `1 entrega → 1 fluxo → 1 ação`**; *"Mapa-OS é projeção visual, não fonte de verdade"*; *"Dia Lógico é entrega, não é data do calendário"*.

### 5.2 CANDIDATO / HIPÓTESE
Os 11 itens de `02_BACKLOG_REQUISITOS_CANDIDATOS.yaml` (`NAO_APROVADO`): `COP-ONB-001` · `COP-DAT-001` · `COP-BKL-001` · `COP-CFG-001` · `COP-AUT-001` · `COP-COG-001` · `COP-OUT-001` · `COP-SKL-001` · `APP-SCR-001` · `APP-VIS-001` · **`SDK-AGT-001` (`DECISAO_REQUERIDA` — fechado por D2 nesta sessão)**. Também: blueprint multiagente (3 agentes vazios), router cognitivo v0.1, 18/94 campos `inferred` do RUN 009, pesquisa TDAH/neurodesign (`PESQUISA_SUPORTE`, nunca obrigação).

### 5.3 CONFLITOS (não resolver por conveniência)
| # | Conflito | Encaminhamento |
|---|---|---|
| C1 | Duas skills homônimas `executar-status-report` (uma com Business Pack + 75 templates) + terceira `status-report` em `operations` | **Aberto — D7** |
| C2 | Essas skills estão **em inglês**, contra a política pt-BR | Resolvido por D5 (forkar e traduzir) |
| C3 | `/situacao` e comandos secundários ausentes de `command-router.json` e do enum de `orchestrator-input.schema.json` | Fechar contrato de comandos na Fase 2 |
| C4 | 4+ candidatos visuais Mapa-OS/WI/SOT sem precedência | **Aberto — D8** |
| C5 | **Geometria Prisma divergente**: 3×99 mm / 100 placeholders (manifest v1.1.0) vs 3×92,333 mm, trim 10 mm (WI kit V2) vs 92 campos (`NOTAS_MAPA_OS`) | **Aberto — D8** |
| C6 | Blueprint multiagente com placeholders vs Copiloto monolítico-modular já implementado | Descartar blueprint como fonte de arquitetura |
| C7 | Estados históricos vs atuais; **data não confere precedência** | Regra de Não Decisão #2 |
| C8 | `PLAN-CARD-5X` legado vs `ACTION UNIT` vigente | ACTION UNIT + campo `legado_id` |
| C9 | **`04_SKILLS_WORKFLOWS/productivity` e `/operations` são plugins first-party da Anthropic** (`plugin.json` → `author: Anthropic`, v1.3.1/v1.3.0), em inglês, skills `start`/`task-management`/`status-report` — não são pacotes proprietários Executar | Resolvido por D5 |
| C10 | `schema_bundle.yaml` (17 domínios, 94 IDs) é **schema de extração documental**, não modelo de domínio operacional | Serve ao Scanner documental; o domínio operacional é o Prisma do PR #1 |
| C11 | **Supabase vs Neon+Prisma** (`REC-001` HIGH; `ONBOARDING.md` e a árvore S14 ainda citam `supabase/`) | Neon+Prisma canônico; ADR de supersessão |
| C12 | **Repositório alvo**: PRD Scanner e PRD MCP escritos para `Sas-Executar/Sas-Executar`; release real em `Sas-Executar/next-forge` PR #1 (`REC-003` HIGH) | Atualizar os PRDs |
| C13 | Drive Sheet pré-RUN009 diverge em **31 campos** (`REC-002`) | Sincronizar só após revisão humana |
| C14 | Três autoridades de estado candidatas: Linear (Process DOC) vs Drive `EXECUTAR_CONTROL_CENTER` (Copiloto SKILL.md) vs banco do app | Resolvido por D4 — **exige ADR de supersessão do princípio central da skill Copiloto** |
| C15 | **Rotas do PR #1 em inglês** (`/copilot`, `/now`, `/today`, `/reports`) vs rotas exigidas pelo S14 em pt-BR (`/copiloto`, `/rotinas`, `/automacoes`, `/mapa-os`, `/scanner`) | Renomear na Fase 6, com mapa `anterior → novo` |
| C16 | `AGENT-FLOW-001` (10 fases) vs Visão Sistêmica Normativa (7 etapas) | Resolvido por D3 — duas camadas + ADR |

### 5.4 LACUNAS
- **"Modo Rotina" tem zero ocorrências no corpus.** Existe `packages/routines` no PR #1, rota `/rotinas` no S14 e a "rotina diária 17h America/Sao_Paulo" do Process DOC — mas o conceito nomeado vem da instrução do usuário. Definir na Fase 4.
- `REQ-COP-004` (três automações): **"Especificação ausente"** + Regra de Não Decisão #8 (benefício, dados, consentimento, risco, reversibilidade antes de propor).
- `REQ-COP-005` (troca de contexto): **"Critérios ausentes"**. Alinhado às lacunas do router: retomada pós-interrupção, captura universal sem troca de contexto, next-action engine genérico, forecast por throughput, limitador WIP transversal.
- Política de fuso, retry, idempotência e notificação do Modo Rotina.
- Matriz de permissões por tenant/conector; gate MCP `QST-03` (credencial por usuário final **bloqueia 70 das 157 tools**).

### 5.5 Reconciliações abertas herdadas (`RECONCILIATION_REGISTER.yaml`)
`REC-001` Supabase×Neon (HIGH) · `REC-002` Sheet 31 campos (HIGH) · `REC-003` repositório (HIGH) · `REC-004` MCP implementado≠deployed (MED) · **`REC-005` PR draft + App/Web/API em ERROR no Vercel por env vars ausentes (HIGH)** · **`REC-006` DINOv2/ONNX `session.run()` nunca executado com modelo real (HIGH)** · `REC-007` campos `inferred` (MED).

**Escada de maturidade obrigatória do corpus:** `DOCUMENTADO ≠ IMPLEMENTADO ≠ FUNCIONAL ≠ TESTADO ≠ VERIFICADO ≠ DEPLOYED ≠ RELEASED`.

---

## 6. Arquitetura proposta

### 6.1 Conciliação das duas sequências (D3)

```
CAMADA 1 — Ativação (uma vez por tenant) · Visão Sistêmica Normativa
  Onboarding → Scanner → Productivity → Operations → Modo Rotina → 1º Entregável
        │ produz: PerfilOperacional, FonteAutorizada, Backlog inicial,
        │          ModeloOperacional, 3 Rotinas propostas, 1º Entregável
        ▼
CAMADA 2 — Operação contínua (recorrente) · AGENT-FLOW-001 (já no PR #1)
  SYNC → UNDERSTAND → STRUCTURE → VISUALIZE → PRE_APPROVE → DECOMPOSE
       → EXECUTE → RECONCILE → REPORT → REPLAN ──(gate)──▶ VISUALIZE
```

Mapa explícito entre camadas, registrado em ADR: `Scanner→SYNC/UNDERSTAND` · `Productivity→STRUCTURE/DECOMPOSE` · `Operations→VISUALIZE/PRE_APPROVE` · `1º Entregável→REPORT` · `Modo Rotina→` agendador que dispara a Camada 2. A Camada 1 **não** substitui `AGENT_FLOW_PHASES`; acrescenta um estágio `ATIVACAO` anterior, com seu próprio enum.

### 6.2 Princípio de orquestração
A Camada 1 é **sequência fixa** ⇒ orquestração **determinística em código**, com o Agent SDK atuando *dentro* de cada etapa. Isso segue o próprio corpus (`NOTAS_AGENT_SDK.md`): *"Não começar multi-agent. Primeiro: SPEC → Prompt → Tools → Permissions → Output Schema → Single Agent → Tracing → Evals → Deploy"* e *"um bom agente não é 'o máximo possível de autonomia'. É o mínimo de autonomia necessário"*. Torna o sistema testável e auditável, e dispensa o blueprint multiagente com placeholders (C6).

### 6.3 Topologia

```
apps/app (Vercel, UI)   apps/mobile (Expo)
        └──────┬─────────────┘
        apps/api (Vercel, borda HTTP/webhooks/cron) ── pré-autentica (Clerk orgId)
                         │ HTTP + SSE
        apps/copiloto-runtime  ◀── NOVO, container de vida longa, fora da Vercel
                         │
              Orquestrador determinístico (TS) — valida handoff (Zod) entre etapas
                         │  query() do Agent SDK por etapa
        agents · plugins(skills executar-*) · tools MCP in-process · hooks
                         │
        @repo/schemas · @repo/domain · @repo/application  (já existem no PR #1)
                         │
        @repo/database (Neon + Prisma) ◀── SOT (D4)
```

### 6.4 Packages e apps — o que muda

| Alvo | Ação | Conteúdo |
|---|---|---|
| **`apps/copiloto-runtime`** | **NOVO** | Servidor Node containerizado que hospeda o Agent SDK. `POST /sessoes`, `POST /sessoes/:id/mensagens`, `GET /sessoes/:id/stream` (SSE), `GET /health`. `Dockerfile`. Recebe apenas requisições pré-autenticadas por `apps/api` (doc: *"the agent should receive pre-authenticated requests"*) |
| **`packages/copiloto-skills`** | **NOVO** | `skills/executar-*/SKILL.md` em pt-BR, carregado via opção `plugins` (caminho local) — **não** via `settingSources`, para permitir `settingSources: []` (isolamento multi-tenant exigido pela doc de hosting) |
| **`packages/agent-runtime`** | **MIGRAR (D2)** | Trocar `ai@^6` por `@anthropic-ai/claude-agent-sdk@0.3.268`. Preservar: `phases.ts` (`AGENT_FLOW_PHASES`, `REPLAN_RETURNS_TO`), `commands/*`, `output-schema.ts`, `format.ts`, `evals/graders.ts` e **todos os testes existentes** — eles são o contrato de regressão da migração |
| `packages/schemas` | ESTENDER | Camada 1: `HandoffEnvelope`, `FaseAtivacao`, `PerfilOperacional`, `FonteAutorizada`, `ModeloOperacional`. Reusar `routine.ts`, `task-state.ts`, `evidence.ts`, `authority.ts`, `scanner.ts` já existentes |
| `packages/domain` | ESTENDER | Máquina de estados da Camada 1 ao lado de `routine-state.ts` / `task-state.ts` |
| `packages/database` | ESTENDER | Modelos da Camada 1 + `EventoAuditoria`; **primeira migration do repositório** (`prisma/migrations/` ainda não existe) |
| `packages/scanner` | COMPLETAR | Fechar `REC-006`: executar `session.run()` com o `dinov2_vits14.onnx` real em device alvo e registrar benchmark (p95 ≤ 500 ms) |
| `packages/routines` | RECONCILIAR | `authority-gate.ts` + `idempotency.ts` já existem; alinhar à máquina normativa `Proposto→Confirmado→Ativo⇄Pausado`, `Ativo→Revisao→Ativo` e aos 10 campos obrigatórios |
| `packages/mapa-os`, `packages/reports` | RECONCILIAR | Resolver C1/C4/C5 após D7/D8; Mapa-OS permanece **projeção**, nunca SOT |
| `apps/app`, `apps/mobile` | ESTENDER + RENOMEAR | Jornada de ativação; rotas pt-BR (C15) com mapa `anterior → novo` |
| `apps/api` | ESTENDER | Proxy pré-autenticado para o runtime; `cron/routines` já existe |
| `packages/observability` | REUSAR + OTEL | `log`, `parseError`; variáveis OTEL no container |
| `packages/auth`, `security`, `rate-limit`, `notifications` | REUSAR sem alteração | `orgId`/`userId`, Arcjet, Upstash, Knock |

### 6.5 Agentes, skills, tools, hooks

**Subagentes** (`AgentDefinition`, programáticos — precedem agentes de filesystem):

| Agente | `tools` | Limite |
|---|---|---|
| `executar-onboarding` | tools MCP próprias | Identidade, objetivos, restrições, IDs verbais, **solicitar autorizações**. Sem acesso a dados externos |
| `executar-scanner` | somente leitura | Detectar tarefas/compromissos/pendências, normalizar, **reportar lacunas**. **Proibido decidir ou gravar** (`disallowedTools` + hook `PreToolUse`) |
| `executar-produtividade` | leitura + escrita de backlog | Modo de trabalho, backlog, prioridade, capacidade, **WIP 1:1:1** |
| `executar-operacoes` | leitura + escrita operacional | Cadência, responsáveis, canais, indicadores, dependências, **propor** rotinas |
| `executar-entregavel` | leitura + render | Consolidar no **template oficial único** |

`model`: `opus` em produtividade/operações; `sonnet` em scanner/entregável (ajustável por eval). Limites: `maxTurns` por agente, `maxBudgetUsd` por sessão, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`.

**Skills** (`packages/copiloto-skills/skills/`, pt-BR): `executar-onboarding` · `executar-scanner` · `executar-backlog` · `executar-priorizacao` · `executar-modelo-operacional` · `executar-modo-rotina` · `executar-status-report` · `executar-mapa-os` · `executar-prisma` · `executar-primeiro-entregavel`. Comandos curtos (`/bomdia`, `/agora`, `/estado`, `/fechardia`, `/replanejamento`) permanecem **aliases de UX**, conforme a política de linguagem.

**Tools** (`createSdkMcpServer` + `tool()` com Zod, in-process): `executar_listar_fontes_autorizadas` · `executar_ler_fonte` · `executar_registrar_item_capturado` · `executar_upsert_tarefa` · `executar_definir_prioridade` · `executar_propor_rotina` · `executar_registrar_execucao_rotina` · `executar_emitir_entregavel` · `executar_solicitar_confirmacao`. `readOnlyHint: true` nas de leitura. **`tenant_id`/`user_id` vêm do closure do servidor, nunca do argumento do modelo** — impede escalonamento por prompt.

**Hooks:** `SessionStart` (abrir `AgentRun`, correlation id, span OTEL) · `PreToolUse` (negar escrita fora da etapa; negar escrita ao scanner; validar tenant) · `PostToolUse` (`EventoAuditoria` com args redigidos) · `PostToolUseFailure` (classificar, decidir retry) · `SubagentStart/Stop` (métricas) · `Stop` (persistir estado, custo) · `PermissionRequest` (rota para confirmação humana na UI).

**Permissões:** `permissionMode: 'dontAsk'` + `allowedTools` explícito (recomendação da doc para agente fechado). Ações sensíveis (ativar rotina, enviar comunicação externa, tools destrutivas do MCP) **não** entram em `allowedTools`: sobem por `PermissionRequest` → UI → aprovação humana. Hooks de deny valem mesmo em modo permissivo.

### 6.6 Persistência, sessões, isolamento
- **SOT: Postgres** (D4). Drive/Linear/Gmail/Outlook viram `IntegrationConnection` + `ExternalObjectRef` (já modelados no PR #1) somente-leitura, com proveniência.
- Transcripts: adaptador **`SessionStore` → Postgres**, obrigatório — sem ele, derrubar o container perde o transcript (doc). Alertar em `mirror_error`.
- Isolamento por tenant (doc de hosting): `settingSources: []`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `CLAUDE_CONFIG_DIR` por tenant, `cwd` por tenant em **toda** chamada `query()`.
- Idempotência: `(tenant_id, etapa, handoff_id)`; `RoutineRun` com `execution_key` única.

---

## 7. Plano de implementação por fase

**Fase -1 — Base da branch de trabalho. ✅ JÁ FEITO.** `claude/lucid-galileo-3jnpad` foi recriada a partir de `origin/claude/trusting-pasteur-w4jzf1` (D1) e carrega apenas este plano e o prompt de ativação em `docs/executar/`. **Nenhum commit foi ou será feito sobre o branch do PR #1**; o PR #1 permanece intocado. A sessão executora deve continuar nesta branch (ou criar uma derivada dela), nunca sobre `main`.

### Fase 0 — Auditoria e reconciliação (sem alterar código de produto)
Confronto `PR #1 × 11 requisitos candidatos × Visão Normativa`, marcando cada item como **existente / parcial / ausente / conflitante / não verificável** (exigência do prompt do handoff). Produz os 12 artefatos obrigatórios de `02_SAIDAS_ESPERADAS.md` em `docs/executar/`: `DIAGNOSTICO_REPOSITORIO.md`, `MATRIZ_FONTE_REQUISITO_CODIGO.csv`, `INVENTARIO_COMPONENTES_AGENTICOS.yaml`, `GRAFO_DEPENDENCIAS.md`, `DECISOES_TECNICAS_PENDENTES.md`, `ADRS_CANDIDATOS/`, `PLANO_IMPLEMENTACAO_INCREMENTAL.md`, `PLANO_SCHEMAS_MIGRACOES.md`, `PLANO_TESTES_EVALS.md`, `PLANO_SEGURANCA_PERMISSOES.md`, `PLANO_OBSERVABILIDADE_OPERACAO.md`, `PLANO_INTEGRACAO_TURBOREPO.md`.
**ADRs obrigatórios:** supersessão Supabase→Neon (C11/REC-001); supersessão da autoridade Drive→Postgres (C14); conciliação `AGENT-FLOW-001` × Visão Normativa (C16/D3); migração AI SDK→Agent SDK (D2).
**Aceite:** `turbo test` verde no branch base (linha de base de regressão registrada); nenhum arquivo de produto alterado.

### Fase 1 — Contratos da Camada 1
Estender `packages/schemas` e `packages/domain` com `HandoffEnvelope`, `FaseAtivacao`, `PerfilOperacional`, `FonteAutorizada`, `ModeloOperacional` e a máquina de ativação. Reusar `references/contracts/orchestrator-{input,output}.schema.json` da skill `copiloto-executar` (já validados, com `route.module`, `read_scope`, `write_policy{requires_human_confirmation}`, `state_transition{guards}`, `ui{...}`) e `03_HANDOFFS/handoff.schema.json` do blueprint, traduzidos para Zod.
**Aceite:** Vitest cobre todas as transições válidas e inválidas; `bun run check` verde.

### Fase 2 — Migração para o Claude Agent SDK
Instalar `@anthropic-ai/claude-agent-sdk@0.3.268`. Reescrever o interior de `@repo/agent-runtime` mantendo sua superfície pública e **fazendo os testes existentes passarem sem alteração** — eles são o contrato de regressão. Fechar o contrato de comandos (C3: `/situacao` e secundários no router e no enum).
**Aceite:** suíte de `agent-runtime` verde contra a nova implementação; `ai@^6` removido do package.

### Fase 3 — Runtime containerizado
`apps/copiloto-runtime` + `Dockerfile` + `SessionStore` Postgres + isolamento por tenant + rotas SSE. `apps/api` passa a pré-autenticar e encaminhar.
**Aceite:** `query()` ponta a ponta no container; **reiniciar o container e dar `resume` na mesma sessão preserva o contexto** (prova o `SessionStore`).

### Fase 4 — Tools, hooks, permissões e Modo Rotina
Tools MCP in-process, hooks, matriz de permissões. Definir o **Modo Rotina** (lacuna §5.4) sobre `packages/routines`: 10 campos obrigatórios, máquina normativa, fuso `America/Sao_Paulo`, retry, idempotência. Sugestão de **exatamente 3** automações, cada uma com benefício, dados necessários, consentimento, risco e reversibilidade (Regra de Não Decisão #8).
**Aceite (testes negativos explícitos):** `executar-scanner` **não consegue** gravar; nenhuma rotina chega a `Ativo` sem `EventoAuditoria` de confirmação humana; `tenant_id` forjado no argumento é ignorado; execução repetida do cron gera **um** `RoutineRun`.

### Fase 5 — Jornada de ativação e 1º entregável
Orquestrador determinístico da Camada 1 com `outputFormat: {type:'json_schema'}` por etapa. Entregável no **template oficial único**, sem alternativas.
**Aceite:** Operations **não inicia** sem saída válida de Productivity (teste negativo); o entregável valida contra o schema e consolida onboarding + scanner + backlog + configuração operacional + status + 3 rotinas + próximos passos.

### Fase 6 — Skills pt-BR, rotas e UI
`packages/copiloto-skills` (D5: forkar/traduzir Productivity e Operations). Renomear rotas para pt-BR (C15) com mapa `anterior → novo` e redirects. UI da ativação em `apps/app` e `apps/mobile`, seguindo `Server Components First`.
**Aceite:** fluxo completo operável por usuário autenticado com `orgId`; nenhuma rota pública com placeholder.

### Fase 7 — Scroll Task (`APP-SCR-001`)
Tela 33/33/33, unidade ativa no centro, escopo `action|task|phase|workflow`, timer 15/30/45, duplo toque expande. Estados `idle|running|expanded|completed|deferred|timer_elapsed`.
**Aceite:** *"Auto-scroll nunca marca conclusão automaticamente"*; *"Usuário inicia execução em ≤2 interações"*. Fora de escopo v1: timer adaptativo por IA, reordenação completa, conclusão automática por tempo.

### Fase 8 — Scanner Visual (`APP-VIS-001`) — fecha `REC-006`
Executar `session.run()` com `dinov2_vits14.onnx` real em device alvo. Símbolos seed `SYM-CHAT-001→OPEN_CHAT`, `SYM-SELECTOR-001→OPEN_SELECTOR`, `SYM-DONE-001→COMPLETE_LATEST_OPEN_TASK`. Edge-triggered, sem tela de confirmação, com `undo(mutationId)`.
**Aceite:** benchmark real registrado; p95 `scan→action` ≤ 500 ms **ou** a meta é explicitamente reclassificada como não atingida (nunca declarada verificada sem medição).

### Fase 9 — Observabilidade, evals, rollout — fecha `REC-005`
OTEL no container (`CLAUDE_CODE_ENABLE_TELEMETRY=1`, exporters OTLP), alerta em `mirror_error`, custo por sessão. Ampliar `evals/{golden,regression,adversarial}.jsonl`. Corrigir as env vars ausentes que deixam `executar-nf-{app,web,api}` em **ERROR** no Vercel. Rollout atrás de feature flag `showCopiloto` (`createFlag` em `packages/feature-flags`), tenant a tenant.
**Rollback:** desligar a flag; nenhuma migration é revertida.

---

## 8. Plano de testes e avaliações

| Camada | Cobertura |
|---|---|
| Regressão do PR #1 | **Linha de base registrada na Fase 0**; a migração de SDK (Fase 2) só passa se a suíte existente continuar verde |
| Contratos | Todas as transições válidas/inválidas das duas máquinas; `HandoffEnvelope`; schemas de saída |
| Tools | Idempotência, escopo de tenant, rejeição de `tenant_id` forjado |
| Hooks/permissões | **Negativos**: scanner não grava; rotina não ativa sem confirmação; tool fora de etapa negada |
| Orquestração | Ordem normativa; Operations bloqueado sem Productivity; falha de schema não coage |
| Runtime | `query()` → `resume` após restart; SSE |
| Rota/UI | Padrões `apps/api/__tests__/health.test.ts` e `apps/app/__tests__/*.test.tsx` |
| **Evals** | `evals/datasets/golden.jsonl` · `regression.jsonl` · `adversarial.jsonl` — qualidade de captura, aderência pt-BR, **exatamente 3** rotinas, ausência de ação não autorizada, e **ausência de linguagem diagnóstica ou promessa médica** (Regra de Não Decisão #9; o router é explícito: *"Nunca diagnosticar ou inferir déficit clínico"*) |

Não há workflow de CI de teste no repositório (só `release.yml`). Propor um é item da Fase 9.

---

## 9. Segurança, falhas e recuperação
- Consentimento por fonte (`IntegrationConnection` + `autorizado_em` + revogação); Scanner lê **somente** fontes autorizadas.
- `ANTHROPIC_API_KEY` apenas no ambiente do runtime; credenciais de conectores **fora** do ambiente do agente (padrão de proxy de egress da doc de secure-deployment).
- Gate MCP: as 18 tools destrutivas só após o gate de confirmação estar testado; `QST-03` (credencial por usuário final) permanece **bloqueando 70 tools** até decisão.
- Rate limit por tenant (`createRateLimiter`); Arcjet na borda.
- `maxBudgetUsd` + `maxTurns` impedem loop infinito — a doc é explícita: *"No top-level session timeout"*.
- Auditoria: todo efeito colateral gera `EventoAuditoria` imutável distinguindo ator humano de agente (`ActorType` já existe).

---

## 10. Decisões ainda pendentes de aprovação

| # | Decisão | Por que ainda está aberta |
|---|---|---|
| **D7** | Qual `executar-status-report` é canônico (base · Business Pack com 75 templates · `status-report` de operations) — C1/C2/C3 | Nenhuma fonte estabelece precedência |
| **D8** | Template canônico Mapa-OS/WI/SOT e **geometria Prisma** (3×99 mm/100 placeholders vs 3×92,333 mm/trim 10 mm vs 92 campos) — C4/C5. O Prisma é projeção do mesmo objeto ou contrato separado? | Três contratos físicos incompatíveis |
| **D9** | Conectores por tenant e modelo de consentimento; gate MCP `QST-03` | Bloqueia 70 das 157 tools |
| **D10** | Política de fuso, retry, repetição e notificações do Modo Rotina | Lacuna sem fonte |
| **D11** | Sincronizar o Drive Sheet (31 campos divergentes, `REC-002`) | Governança exige revisão humana, "não sobrescrever cegamente" |
| **D12** | O PR #1 deve ser mergeado antes, ou o trabalho segue empilhado sobre a branch? | Afeta estratégia de merge e risco de conflito |

---

## 11. Riscos
| Risco | Mitigação |
|---|---|
| **Migração de SDK quebrar código testado** | Suíte existente como contrato de regressão; migração isolada na Fase 2; superfície pública preservada |
| Custo/latência do Agent SDK por sessão | `effort` por agente, `maxBudgetUsd`, `maxTurns`, cache, modelo menor no scanner |
| Perda de transcript em restart | `SessionStore` Postgres obrigatório + alerta em `mirror_error` |
| Vazamento entre tenants | `settingSources: []`, `CLAUDE_CONFIG_DIR`/`cwd` por tenant, tenant no closure da tool, teste negativo |
| **Conflito de merge com o PR #1** | Não commitar sobre o branch do PR #1; resolver D12 cedo |
| Declarar estado maduro demais | Escada `DOCUMENTADO ≠ … ≠ RELEASED`; Vercel em ERROR (`REC-005`) impede declarar DEPLOYED; `session.run()` não executado impede declarar o Scanner VERIFICADO |
| Adoção de fonte desatualizada (C7) | Data não confere precedência; registrar `NAO_DETERMINADO` |

---

## 12. Verificação end-to-end (após implementação)
1. `bun install` · `bun run check` · `turbo test` — verdes, comparados à linha de base da Fase 0.
2. `bun run migrate` em banco de desenvolvimento; `packages/database/generated` atualizado; `Page` preservado.
3. `docker build` / `docker run` de `apps/copiloto-runtime`; `GET /health` responde; `query()` de fumaça retorna `success`.
4. Reiniciar o container e `resume` da mesma sessão → contexto preservado.
5. `bun run dev`; autenticar em `localhost:3000` com organização; percorrer a Camada 1 completa até o primeiro entregável, depois um ciclo da Camada 2.
6. Negativos manuais: ativar rotina sem confirmação · Operations sem Productivity · `tenant_id` forjado · scanner tentando gravar — todos falham com `EventoAuditoria`.
7. `GET /cron/routines` duas vezes → **um** `RoutineRun`.
8. Scanner em device físico com o ONNX real; registrar p95 medido.
9. Conferir spans/métricas OTEL e custo por sessão; `executar-nf-{app,web,api}` saem de ERROR no Vercel.
