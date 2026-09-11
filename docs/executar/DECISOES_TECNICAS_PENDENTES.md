# Decisões Técnicas Pendentes — Fase 0

Consolida D7–D12 (herdadas do plano) com o que esta auditoria conseguiu, ou
não conseguiu, esclarecer por inspeção de código. Nenhuma é resolvida aqui
por conveniência — cada uma continua `DECISAO_REQUERIDA` até o usuário
decidir, conforme a Regra de Não Decisão do plano.

| # | Decisão | O que o código real acrescenta | Ainda falta para decidir |
|---|---|---|---|
| **D7** | Qual `executar-status-report` é canônico (base / Business Pack 75 templates / `status-report` de operations) | **Nada** — nenhum dos três candidatos existe dentro de `next-forge` (skills `executar-*` ainda não foram criadas). `packages/reports` tem um `StatusReport` builder "3P+N" real e testado, mas é uma implementação de domínio (Prisma model `StatusReport`), não uma das três skills candidatas do Blueprint. | Acesso ao Blueprint (ou o usuário colar o conteúdo dos 3 candidatos) para comparar contra o builder já implementado em `packages/reports`. |
| **D8** | Template canônico Mapa-OS/WI/SOT e geometria Prisma (3×99mm/100 placeholders vs. 3×92,333mm/trim 10mm vs. 92 campos) | **Nada** — nenhuma constante de geometria física (mm, placeholders) foi encontrada em `packages/mapa-os/src/projections/*.ts`. O código atual não commitou a nenhuma das três opções ainda. | Decisão do usuário — é uma escolha de design físico, não algo que o código resolve sozinho. |
| **D9** | Conectores por tenant, modelo de consentimento, gate MCP `QST-03` (70/157 tools bloqueadas) | `IntegrationConnection` (Prisma) já registra conexão por workspace; `packages/integrations/src/connections.ts` existe. O número "157" não é verificável nesta sessão. O MCP real hoje só tem **12 tools**, todas já auditadas (`logToolCall`) e sem bypass de autoridade — ou seja, o "gate" de credencial-por-usuário-final ainda não é uma questão prática até o catálogo crescer muito além de 12. | Se D9 é sobre o catálogo de 157 do Blueprint, precisa do Blueprint. Se é sobre o modelo de consentimento das 12 tools reais, pode ser decidido agora sem o Blueprint — **recomendação**: desacoplar D9 em "D9a: consentimento para as 12 tools reais" (decidível já) e "D9b: gate para o catálogo de 157" (adiado até o catálogo existir). |
| **D10** | Política de fuso, retry, repetição e notificações do Modo Rotina | `apps/api/app/cron/routines/route.ts` já tem `POLL_TOLERANCE_MS` e roda 1x/dia (degradação Vercel Hobby, disclosed). `packages/routines/src/idempotency.ts` existe. Fuso `America/Sao_Paulo` é citado no plano mas não encontrado como constante no código. | Decisão do usuário sobre a política em si (a infraestrutura de cron já existe e pode hospedar qualquer política decidida). |
| **D11** | Sincronizar o Drive Sheet (31 campos divergentes, REC-002) | Nada — é uma planilha externa, fora do alcance de uma auditoria de código. | Revisão humana explícita, como o próprio plano exige ("não sobrescrever cegamente"). |
| **D12** | O PR #1 deve ser mergeado antes, ou o trabalho segue empilhado sobre a branch? | Esta sessão está rodando sobre `claude/lucid-galileo-3jnpad`, que já é uma derivação do head do PR #1 — ou seja, na prática **o trabalho já está empilhado**, respondendo operacionalmente a metade da pergunta. O que falta decidir é se o PR #1 deve ser mergeado em `main` antes das Fases 1–9 continuarem, ou se um novo PR (desta branch) deve esperar o #1. | Decisão do usuário — tem implicação de risco de conflito de merge (plano §11), não uma questão técnica que o código resolve. |

## Nova observação desta auditoria, fora do D7–D12 original

**D13 (proposta, não numerada no plano original)**: a Fase 3 muda
`apps/api/app/copilot/command/route.ts` de chamada in-process de
`@repo/agent-runtime` para proxy HTTP contra `apps/copiloto-runtime`. Isso
não é uma decisão de produto, mas é uma decisão técnica com efeito em teste
existente (`api/__tests__/copilot-command.test.ts`, 3 testes verdes hoje) —
registrar aqui para que a Fase 3 não trate isso como incremental sem mais.
Não bloqueia a Fase 0; é um aviso para quem executar a Fase 3.

## Como esta lista deveria ser resolvida

Nenhum item acima é resolvido nesta Fase 0, por desenho (o prompt de
ativação pede para "perguntar antes de implementar o que depende delas").
A recomendação desta auditoria é: antes de iniciar a Fase 1, o usuário
decide (a) se anexa `Executar-app-Blueprint` a uma sessão futura para
resolver D7/D8/D9b/D11 com a fonte completa, ou (b) resolve cada uma
diretamente em texto, aceitando que esta sessão trabalhe só com o que foi
já extraído no plano.
