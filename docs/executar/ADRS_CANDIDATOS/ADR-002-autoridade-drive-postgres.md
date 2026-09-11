# ADR-002 — Supersessão da autoridade de estado: Drive → Postgres

| Campo | Valor |
|---|---|
| **Status** | Proposto (candidato) |
| **Relacionado** | C14, D4 |
| **Data** | 2026-09-11 |

## Contexto

A skill `copiloto-executar` do Blueprint declara (segundo o plano, §5.3 C14)
o princípio `EXECUTAR_CONTROL_CENTER` no Google Drive como fonte de estado.
Isso conflita com três autoridades candidatas citadas no plano: Linear
(Process DOC), Drive (`EXECUTAR_CONTROL_CENTER`, skill Copiloto SKILL.md) e
o banco do app. D4 já fechou isso a favor do Postgres — este ADR formaliza
a supersessão explícita que D4 exige ("exige ADR de supersessão do
princípio central da skill Copiloto").

## Verificação nesta sessão

- `packages/database/prisma/schema.prisma`: 30 models reais, incluindo
  `Workspace`, `Task`, `Action`, `Evidence`, `Routine`, `AgentRun`,
  `AuditEvent` — schema real, com `relationMode: foreignKeys` (FK
  reforçadas de verdade, não apenas "prisma" relation mode).
- `packages/integrations/src/connections.ts` + o model Prisma
  `IntegrationConnection`/`ExternalObjectRef`: fontes externas (Gmail,
  Outlook, WhatsApp, Google Calendar) já são modeladas como **conexões
  somente-leitura com proveniência**, nunca como autoridade de escrita.
  Isso é consistente com D4, não uma mudança nova.
- `packages/mcp/src/server.ts`: toda mutação passa pelos guards de domínio
  com `actor: "AGENT"`; nenhuma tool escreve diretamente num destino
  externo como fonte de verdade.
- Nenhum código encontrado que leia ou escreva em um "Drive Sheet" como
  autoridade operacional — a única menção a essa ideia está nos documentos
  de planejamento (`docs/executar/PLANO_EXECUTAR_COPILOTO.md`), não em
  código de produto.

## Decisão

**O Postgres do app (`@repo/database`, Neon), acessado só via Prisma, é a
única fonte de verdade (SOT) para estado operacional canônico** (Workspace,
Task, Routine, Evidence, AgentRun etc.). Google Drive, Linear, Gmail e
Outlook são **fontes autorizadas somente-leitura**, sempre com proveniência
registrada via `IntegrationConnection`/`ExternalObjectRef`, nunca como
destino de escrita de estado canônico. O princípio
`EXECUTAR_CONTROL_CENTER` da skill `copiloto-executar` (Blueprint) é
formalmente superado por esta decisão.

## Consequências

- Qualquer skill `executar-*` (Fase 6) que for forkada/traduzida do
  Blueprint precisa ter esse princípio reescrito na tradução, não copiado
  verbatim — isso é trabalho explícito de Fase 6, não desta Fase 0.
- `D11` (sincronizar o Drive Sheet) continua sendo tratado como
  reconciliação de dados legados, não como uma segunda fonte de verdade.
- A sincronização de fontes externas (`packages/integrations`) já segue
  este princípio no código — nenhuma mudança de implementação necessária
  agora.

## Status de ratificação

Candidato — pendente de aprovação do usuário.
