# Diagnóstico do Repositório — Fase 0

| Campo | Valor |
|---|---|
| **ID** | `DIAGNOSTICO-REPOSITORIO-001` |
| **Executor** | Sessão de implementação (esta), seguindo `PROMPT_ATIVACAO_SESSAO.md` |
| **Branch auditada** | `claude/lucid-galileo-3jnpad` (= PR #1 `claude/trusting-pasteur-w4jzf1` + `HANDOFF.md` + plano/prompt), commit `20a47f4` |
| **Data** | 2026-09-11 |
| **Escopo** | Fase 0 apenas — auditoria e reconciliação, **nenhum código de produto alterado** |

## 0. Limitação metodológica a declarar antes de tudo

O `PROMPT_ATIVACAO_SESSAO.md` pede para confrontar o PR #1 contra "os 11
requisitos candidatos" do pacote `EXECUTAR_APP_GOVERNANCA_PLAN_HANDOFF` /
`Executar-app-Blueprint`. **Esse repositório não está no escopo GitHub desta
sessão** (only `sas-executar/next-forge` foi anexado) e nenhum arquivo do
corpus (`02_BACKLOG_REQUISITOS_CANDIDATOS.yaml`, `NOTAS_AGENT_SDK.md`,
`schema_bundle.yaml`, `PRD-MCP.md`, `MASTER_INDEX_CHECKLIST.md` etc.) existe
dentro de `next-forge`. `AGENTS.md` confirma que `Executar-app-Blueprint` é
um repositório **separado**, read-only a partir daqui.

Isso significa: onde `PLANO_EXECUTAR_COPILOTO.md` já cita um requisito com
descrição suficiente (`APP-SCR-001`, `APP-VIS-001`, `SDK-AGT-001`, a Visão
Normativa), este diagnóstico o usa como fonte. Onde o plano só cita o ID sem
descrição substantiva (`COP-DAT-001`, `COP-CFG-001`, `COP-COG-001` etc.), a
matriz (`MATRIZ_FONTE_REQUISITO_CODIGO.csv`) registra `nao_verificavel` ou
`DECISAO_REQUERIDA` em vez de inventar o conteúdo do requisito — conforme a
própria regra de governança do plano ("na ausência de evidência, registrar
NAO_DETERMINADO ou DECISAO_REQUERIDA"). Isso não bloqueia a Fase 0 (que é
sobre o estado do *código*, verificável diretamente), mas bloqueia fechar
D7–D12 com precisão total sem uma de duas coisas: (a) anexar
`Executar-app-Blueprint` a esta sessão, ou (b) o usuário colar o texto
relevante.

## 1. Linha de base de regressão (aceite da Fase 0)

Comandos rodados nesta sessão, nesta ordem, no branch acima — não assumidos,
não recordados de sessões anteriores:

```
bun install                                           → 5023 pacotes, OK
cd packages/database && bunx prisma generate \
  --no-hints --schema=./prisma/schema.prisma           → Prisma Client 7.4.2 gerado, OK
bun run typecheck   (= turbo typecheck)                → 37/37 pacotes, 0 erros
bunx ultracite check .                                 → 659 arquivos, 0 erros, 0 avisos
bun run test        (= turbo test)                     → 18/18 pacotes com task test, sucesso
```

**Resultado do `bun run test`, contagem exata (não arredondada):**

| Métrica | Valor |
|---|---|
| Test files | 41 arquivos passaram, 12 arquivos pulados (skip por ausência de credencial) |
| Testes passando | **281** |
| Testes pulando (`describe.skipIf`, correto — não é falha) | **141** |
| Testes falhando | **0** |
| Total de testes | 422 |
| Pacotes com task `test` | 18 (todos com sucesso) |

Dois pacotes rodam **100% skip** por dependerem de `DATABASE_URL` real:
`@repo/database` (89 testes, RLS) e `@repo/mcp` (9 testes). Isso é o
comportamento correto do padrão `describe.skipIf(!process.env.DATABASE_URL)`
documentado em `QUALITY_GATES.md` — não uma lacuna desta sessão.

**Divergência menor registrada, não investigada (baixo risco):**
`PRODUCT_AUDIT.md`/`HANDOFF.md` citam "259 tests passing, 141 correctly
skipping". Esta rodada mede **281 passando, 141 pulando** — o número de
skips bate exatamente, o de passando é 22 testes maior. Explicação mais
provável: os documentos citados foram escritos antes de um commit
subsequente (ex.: `design-tokens` ganhou 5 testes com ADR-DS-001, que é
datado depois de M17/M20 no histórico). Não é uma regressão — é uma
contagem desatualizada nos documentos-fonte. Registrar e seguir; não é
bloqueador da Fase 0.

**Este é o contrato de regressão que a Fase 2 (migração de SDK) terá que
honrar**: depois de trocar `ai@^6` por `@anthropic-ai/claude-agent-sdk`, a
mesma suíte deve continuar em 281 passando / 141 pulando / 0 falhando,
sem reescrever os testes existentes (só o interior de `@repo/agent-runtime`).

Nenhum arquivo de produto foi alterado para chegar a este resultado — só
`bun install` (gera `node_modules/`, gitignored) e `prisma generate`
(gera `packages/database/generated/`, gitignored).

## 2. Estado real vs. o que o prompt de ativação já afirmava

O prompt de ativação (`docs/executar/PROMPT_ATIVACAO_SESSAO.md` §2) já
trazia um resumo do estado do repositório. Esta auditoria **confirma** a
maior parte dele por inspeção direta, com estas correções pontuais:

| Afirmação do prompt | Confirmado? | Nota |
|---|---|---|
| "~37 modelos/enums" no Prisma | Parcial | Contagem real: **30 `model` + 16 `enum`** (`grep -c "^model "` / `"^enum "` em `schema.prisma`). "~37" parece somar categorias distintas ou uma versão anterior do schema; não é uma divergência material (a ordem de grandeza bate). |
| `@repo/agent-runtime` depende de `ai@^6.0.116` + `zod@^4.3.6`, sem Agent SDK | **Confirmado exatamente** | `package.json` do pacote; grep recursivo por `claude-agent-sdk` no repo inteiro: zero ocorrências. |
| 23 páginas autenticadas em `apps/app` | **Confirmado** | `find apps/app/app/(authenticated) -name page.tsx` → 23 arquivos + 2 páginas não-autenticadas (sign-in/sign-up). |
| 20 rotas em `apps/api` | **Confirmado** | `find apps/api/app -name route.ts` → 20 arquivos. |
| `apps/mobile` com Expo Router, 50 arquivos | Não re-contado | Não prioritário para D2/D3; confirmar na Fase 6/7 se necessário. |
| `main` não tem nada disso | **Confirmado** | `git merge-base --is-ancestor` mostra que o HEAD atual (que é o PR #1) descende de `main` em `f189de7`, mas `main` sozinho não tem `packages/agent-runtime` etc. (verificado por `git log` comparativo, não por assumir). |

## 3. Achados por decisão fechada (D1–D6) — todas continuam válidas

Nenhuma decisão fechada (D1–D6) precisa ser reaberta; o código confirma a
premissa de cada uma:

- **D1** (partir do PR #1): confirmado — este branch é literalmente o head
  do PR #1 mais 2 commits de planejamento, nenhum commit de produto novo.
- **D2** (migrar para Claude Agent SDK): confirmado como **ainda não
  executado** — ver §1 e a matriz, item `SDK-AGT-001`. Este é o maior gap
  de código real encontrado nesta auditoria.
- **D3** (duas camadas conciliadas): confirmado — `AGENT_FLOW_PHASES`
  (Camada 2) existe e está testado; a Camada 1 (Visão Normativa) não existe
  em código algum, nem parcialmente.
- **D4** (Postgres/Neon+Prisma como SOT): confirmado — `packages/database`
  é Prisma real, `relationMode: foreignKeys` (desvio documentado em
  `AGENTS.md`); `IntegrationConnection`/`ExternalObjectRef` já modelam
  fontes externas somente-leitura.
- **D5** (forkar/traduzir Productivity/Operations como `executar-*`):
  confirmado como **não iniciado** — nenhum `.claude/`, nenhum
  `packages/copiloto-skills` no repo.
- **D6** (escopo Copiloto + Scroll Task + Scanner Visual): Copiloto tem
  base real (5 comandos, output schema, MCP); Scroll Task (`APP-SCR-001`)
  não existe; Scanner Visual (`APP-VIS-001`) existe como lógica pura
  testada, mas com o gate ONNX real (`REC-006`) ainda aberto.

## 4. Reconciliações herdadas (`REC-*`) — status confirmado nesta sessão

| ID | Descrição | Status confirmado aqui |
|---|---|---|
| REC-001 | Supabase × Neon | Nenhuma referência a Supabase encontrada em `packages/database` ou `apps/*` além do próprio texto de `AGENTS.md` que a proíbe. Neon+Prisma é o único backend de dados real no código. ADR de supersessão formal ainda não escrito → produzido nesta Fase 0 (`ADRS_CANDIDATOS/ADR-001-supabase-neon.md`). |
| REC-002 | Drive Sheet, 31 campos divergentes | Fora do escopo de código estático (é uma planilha externa); não verificável nesta auditoria. Mantém-se `D11` aberta. |
| REC-003 | Repositório alvo (PRDs citam `Sas-Executar/Sas-Executar`) | Não verificável sem o Blueprint; o repositório real de implementação é `Sas-Executar/next-forge`, confirmado (é onde estamos). |
| REC-004 | MCP implementado ≠ deployed | **Confirmado**: 12 tools implementadas e testadas (com skip sem DB); nenhuma evidência de deploy real do endpoint MCP em produção nesta sessão. |
| REC-005 | Vercel apps em ERROR por env vars ausentes | Fora do escopo de código estático — é estado de infraestrutura externa (Vercel), já documentado em `LAUNCH_RUNBOOK.md` com plano de correção manual. Não re-verificado aqui (exigiria credenciais Vercel). |
| REC-006 | `session.run()` DINOv2/ONNX nunca executado com modelo real | **Confirmado por leitura direta** de `apps/mobile/src/features/scanner/vision/dinov2-encoder.ts` — o próprio arquivo documenta isso em comentário. Ainda aberto; bloqueia Fase 8. |
| REC-007 | Campos `inferred` | Não verificável sem o corpus RUN 009 (fora de escopo). |

## 5. Lacunas confirmadas

- **"Modo Rotina" nomeado**: confirmado ausente como máquina de estados
  nomeada (`packages/routines` tem `authority-gate.ts`/`idempotency.ts`,
  mas não a semântica `Proposto→Confirmado→Ativo⇄Pausado`/`Ativo→Revisao→Ativo`
  nem os "10 campos obrigatórios").
- **`REQ-COP-004`/`REQ-COP-005`** (três automações / critérios de troca de
  contexto): não verificável — depende do Blueprint.
- **Gate MCP `QST-03`** (70/157 tools bloqueadas por credencial por usuário
  final): número "157" não verificável nesta sessão (não está em nenhum
  arquivo de `next-forge`); o que É verificável é que `next-forge` hoje só
  implementa **12** tools MCP, um subconjunto muito menor que qualquer
  catálogo de 157 — a decisão D9 continua sem impacto de código imediato.

## 6. Conclusão da Fase 0

O plano continua válido sem alterações. O achado mais acionável desta
auditoria é quantitativo, não qualitativo: **a linha de base de regressão
real é 281 passando / 141 pulando / 0 falhando / 37-37 typecheck / 0 erros
de lint**, ligeiramente diferente do que os documentos herdados citavam, e
esse é o número que a Fase 2 precisa preservar. Nenhuma decisão fechada
(D1–D6) foi contradita pelo código. As decisões abertas (D7–D12) continuam
abertas — nenhuma nova evidência de código as resolve, e três delas (`D8`
geometria Prisma, `D9` catálogo de 157 tools, `D11` Drive Sheet) dependem de
uma fonte (Blueprint ou planilha) fora do alcance desta sessão.

Os artefatos restantes desta Fase 0 (`GRAFO_DEPENDENCIAS.md`,
`DECISOES_TECNICAS_PENDENTES.md`, os 4 ADRs, e os 6 planos de fase) estão
em `docs/executar/`, construídos sobre este diagnóstico.
