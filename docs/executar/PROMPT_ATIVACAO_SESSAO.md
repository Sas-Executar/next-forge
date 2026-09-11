# Prompt de Ativação — Execução do Plano Executar/Copiloto

| Campo | Valor |
|---|---|
| **ID** | `PROMPT-ATIVACAO-EXECUTAR-001` |
| **Para** | Uma nova sessão de Claude Code que vai **implementar** o plano |
| **Plano** | `docs/executar/PLANO_EXECUTAR_COPILOTO.md` (status: **APROVADO, NÃO EXECUTADO**) |
| **Branch base** | `claude/lucid-galileo-3jnpad` — derivada de `claude/trusting-pasteur-w4jzf1` (PR #1) |

---

## Como usar

Abra uma nova sessão de Claude Code **neste repositório**, garanta que ela está na branch
`claude/lucid-galileo-3jnpad` (ou numa branch derivada dela — **nunca sobre `main`**),
e cole o bloco abaixo como primeira mensagem.

---

## ► Prompt (copie a partir daqui)

````text
/claude-api

Atue como arquiteto e implementador do Executar App / Agente Copiloto neste Turborepo.

## 0. Contexto de partida (não re-derive — leia)

O planejamento já foi feito e APROVADO por mim em 2026-09-11. Não replaneje do zero.
Leia, nesta ordem, antes de qualquer outra coisa:

1. `docs/executar/PLANO_EXECUTAR_COPILOTO.md` — o plano aprovado. É a sua instrução principal.
2. `HANDOFF.md` (raiz) — continuidade da sessão que construiu o PR #1.
3. `PRODUCT_AUDIT.md` — tabela de milestones M00–M21 já entregues.
4. `LAUNCH_RUNBOOK.md` — o que está 🤖 feito vs. 🧑 pendente de humano.
5. `AGENTS.md` e `QUALITY_GATES.md` — regras do repositório.

## 1. Especialidade obrigatória

Ative a skill `/claude-api` e confirme qual documentação consultou.

ATENÇÃO — limitação conhecida: a skill `/claude-api` declara explicitamente que
"does not generate Claude Agent SDK code". Ela cobre Claude API e Managed Agents.
Portanto, para tudo que envolver o Agent SDK você DEVE consultar a documentação
oficial atual em `code.claude.com/docs/en/agent-sdk/` (overview, typescript,
subagents, hooks, permissions, sessions, custom-tools, skills, hosting) via WebFetch.
Não improvise contratos de Agent SDK a partir de memória.

Versão aplicável já verificada: `@anthropic-ai/claude-agent-sdk@0.3.268`,
`engines.node >= 18`, zero dependências de runtime, binário nativo do Claude Code
via optionalDependencies por plataforma.

## 2. Estado real do repositório (já verificado — confirme, não redescubra)

- A branch atual deriva de `claude/trusting-pasteur-w4jzf1`, o head do PR #1
  (https://github.com/Sas-Executar/next-forge/pull/1) — aberto, draft, 461 arquivos.
- JÁ EXISTEM e estão testados: `packages/{agent-runtime,domain,application,schemas,
  routines,automation,mapa-os,reports,scanner,mcp,integrations,billing,design-tokens}`,
  `apps/mobile` (Expo), `evals/{datasets,regression,adversarial}`, ~37 modelos/enums
  Prisma (Workspace, Task, Routine, RoutineRun, StatusReport, MapaOS, VisualSymbol,
  AgentRun, ToolCall, ...), 23 páginas autenticadas em `apps/app`, 20 rotas em `apps/api`.
- `@repo/agent-runtime` hoje usa o Vercel AI SDK (`ai@^6.0.116`).
  `@anthropic-ai/claude-agent-sdk` NÃO aparece em nenhum arquivo do branch.
- `main` NÃO tem nada disso. Nunca use `main` como base.

## 3. Decisões já tomadas por mim — NÃO reabra

- D1 Base do trabalho: partir do PR #1, não do `main`.
- D2 SDK: MIGRAR TUDO para o Claude Agent SDK, em runtime containerizado fora da Vercel.
  Motivo: o Agent SDK sobe um subprocesso `claude` de vida longa com disco local
  (~1 GiB RAM/agente), incompatível com função serverless da Vercel.
- D3 Sequência: são DUAS CAMADAS conciliadas, com mapa explícito e ADR.
  Camada 1 (ativação, uma vez por tenant) = Visão Sistêmica Normativa:
    Onboarding → Scanner → Productivity → Operations → Modo Rotina → 1º Entregável.
  Camada 2 (operação recorrente) = AGENT-FLOW-001, já implementado:
    SYNC → UNDERSTAND → STRUCTURE → VISUALIZE → PRE_APPROVE → DECOMPOSE
    → EXECUTE → RECONCILE → REPORT → REPLAN (REPLAN volta a VISUALIZE).
- D4 Fonte canônica: Postgres do app (Neon + Prisma). Drive/Linear/Gmail/Outlook são
  fontes autorizadas somente-leitura com proveniência. Exige ADR de supersessão do
  princípio "EXECUTAR_CONTROL_CENTER no Drive" da skill copiloto-executar.
- D5 Productivity/Operations: forkar e traduzir como skills `executar-*` em pt-BR.
  (São plugins first-party da Anthropic, em inglês — não são pacotes Executar.)
- D6 Escopo: Copiloto + Scroll Task (APP-SCR-001) + Scanner Visual (APP-VIS-001).

## 4. Decisões AINDA ABERTAS — pergunte antes de implementar o que depende delas

- D7 Qual `executar-status-report` é canônico (base / Business Pack com 75 templates /
  `status-report` do pacote operations).
- D8 Template canônico Mapa-OS/WI/SOT e geometria do Prisma
  (3×99 mm com 100 placeholders vs. 3×92,333 mm com trim 10 mm vs. 92 campos).
  E: o Prisma é projeção do mesmo objeto ou contrato separado?
- D9 Conectores por tenant e modelo de consentimento; gate MCP QST-03
  (credencial por usuário final bloqueia 70 das 157 tools).
- D10 Política de fuso, retry, repetição e notificações do Modo Rotina.
- D11 Sincronizar o Drive Sheet (31 campos divergentes, REC-002) — exige revisão humana.
- D12 O PR #1 deve ser mergeado antes, ou o trabalho segue empilhado sobre a branch?

## 5. Regras de governança que valem durante toda a implementação

- Todo conteúdo humano novo em português do Brasil.
- Novas skills, workflows e comandos canônicos começam por `executar-`.
  Comandos curtos (`/bomdia`, `/agora`, `/estado`, `/fechardia`, `/replanejamento`)
  permanecem apenas como aliases de UX.
- NÃO traduzir silenciosamente IDs, enums, nomes de API ou campos persistidos.
  Qualquer migração de identificador exige mapa `anterior → novo` + impacto.
- Estados canônicos permanecem em inglês: BACKLOG_VALIDATED → READY → DOING →
  VERIFY → DONE, mais BLOCKED. Traduzir só os rótulos de interface.
- Escada de maturidade obrigatória, nunca pule degraus na hora de relatar:
  DOCUMENTADO ≠ IMPLEMENTADO ≠ FUNCIONAL ≠ TESTADO ≠ VERIFICADO ≠ DEPLOYED ≠ RELEASED.
- Regras de Não Decisão: data recente não confere autoridade; código existente não prova
  que o comportamento é desejado; protótipo não define segurança nem persistência;
  na ausência de evidência registre NAO_DETERMINADO ou DECISAO_REQUERIDA.
- Uma automação só pode ser proposta depois de identificar benefício, dados necessários,
  consentimento, risco e reversibilidade.
- NUNCA diagnosticar, inferir déficit clínico ou fazer promessa médica. Isso é item de eval.
- Mapa-OS é projeção visual, nunca fonte de verdade.
- WIP operacional é 1 entrega → 1 fluxo → 1 ação.

## 6. O que fazer agora

Execute a Fase 0 do plano e PARE para minha revisão antes da Fase 1.

Fase 0 — Auditoria e reconciliação, sem alterar código de produto:
  a) Rode `bun install`, `bun run check` e `turbo test`. Registre a LINHA DE BASE de
     regressão (contagens exatas). Ela é o contrato que a migração de SDK terá de honrar.
  b) Confronte PR #1 × os 11 requisitos candidatos × a Visão Normativa, marcando cada
     item como existente / parcial / ausente / conflitante / não verificável.
  c) Produza em `docs/executar/` os 12 artefatos exigidos pelo handoff:
     DIAGNOSTICO_REPOSITORIO.md, MATRIZ_FONTE_REQUISITO_CODIGO.csv,
     INVENTARIO_COMPONENTES_AGENTICOS.yaml, GRAFO_DEPENDENCIAS.md,
     DECISOES_TECNICAS_PENDENTES.md, ADRS_CANDIDATOS/,
     PLANO_IMPLEMENTACAO_INCREMENTAL.md, PLANO_SCHEMAS_MIGRACOES.md,
     PLANO_TESTES_EVALS.md, PLANO_SEGURANCA_PERMISSOES.md,
     PLANO_OBSERVABILIDADE_OPERACAO.md, PLANO_INTEGRACAO_TURBOREPO.md.
  d) Escreva os 4 ADRs obrigatórios: supersessão Supabase→Neon (REC-001);
     supersessão da autoridade Drive→Postgres (D4); conciliação AGENT-FLOW-001 ×
     Visão Normativa (D3); migração AI SDK → Agent SDK (D2).

Depois da Fase 0, pare e me apresente o resultado. As fases 1 a 9 estão detalhadas
no plano e só começam com minha aprovação explícita de cada uma.

## 7. Como trabalhar

- Commits pequenos e reversíveis, mensagens em português, uma fase por vez.
- Não instale dependências fora das previstas no plano sem me avisar.
- Não rode migrações contra banco de produção.
- Não faça commit sobre `claude/trusting-pasteur-w4jzf1` — ele é a base do PR #1.
- Ao final de cada fase: `bun run check` + `turbo test` verdes, comparados à linha de base.
- Se encontrar conflito entre fontes, exponha impacto, alternativas e recomendação,
  e me pergunte. Não resolva por conveniência.
````

## ◄ Fim do prompt

---

## Anexo — decisões e conflitos, referência rápida

### Decisões fechadas
| # | Decisão | Escolha |
|---|---|---|
| D1 | Base do trabalho | PR #1, não `main` |
| D2 | SDK do agente | Migrar tudo para o Claude Agent SDK, runtime containerizado |
| D3 | Sequência | Duas camadas conciliadas (Ativação + AGENT-FLOW-001) |
| D4 | Fonte canônica | Postgres (Neon + Prisma) |
| D5 | Productivity/Operations | Forkar e traduzir como `executar-*` pt-BR |
| D6 | Escopo | Copiloto + Scroll Task + Scanner Visual |

### Decisões abertas
`D7` status report canônico · `D8` template Mapa-OS e geometria Prisma · `D9` conectores, consentimento e gate MCP QST-03 · `D10` fuso/retry/notificações do Modo Rotina · `D11` sincronização do Drive Sheet · `D12` merge do PR #1

### Reconciliações herdadas em aberto
`REC-001` Supabase×Neon (HIGH) · `REC-002` Sheet com 31 campos divergentes (HIGH) · `REC-003` repositório alvo (HIGH) · `REC-004` MCP implementado ≠ deployed (MED) · `REC-005` PR draft + App/Web/API em ERROR no Vercel por env vars ausentes (HIGH) · `REC-006` DINOv2/ONNX `session.run()` nunca executado com modelo real (HIGH) · `REC-007` campos `inferred` (MED)

### Lacunas sem fonte
"Modo Rotina" (zero ocorrências no corpus) · especificação das três automações (`REQ-COP-004`) · critérios de troca de contexto (`REQ-COP-005`) · política de fuso/retry/idempotência/notificação · matriz de permissões por tenant
