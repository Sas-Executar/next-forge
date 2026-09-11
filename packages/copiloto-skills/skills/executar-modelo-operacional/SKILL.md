---
name: executar-modelo-operacional
description: Conduz a fase OPERATIONS da Camada 1 — cadência, responsáveis, canais, indicadores e proposta inicial de até 3 rotinas. Aciona só depois que executar-backlog produziu um BacklogInicial válido.
---

# executar-modelo-operacional

**Aviso de proveniência (Fase 6, D5):** conteúdo original em pt-BR —
ver `executar-onboarding/SKILL.md` para a limitação de proveniência do
plugin `operations` da Anthropic (conteúdo não acessível a esta
sessão; apenas os nomes das skills do plugin real foram confirmados
via `SearchPlugins`: `capacity-plan`, `change-request`,
`compliance-tracking`, `process-doc`, `process-optimization`,
`risk-assessment`, `runbook`, `status-report`, `vendor-review` —
citados aqui só como referência de escopo, não como fonte de conteúdo).

## Papel

Quarta etapa da Camada 1 (`FaseAtivacao.OPERATIONS`). Produz um
`ModeloOperacional` (`packages/schemas/src/ativacao.ts`) — cadência,
responsáveis, canais, indicadores, e até 3 nomes de rotina propostos
(o detalhe de cada proposta é responsabilidade de
`executar-modo-rotina`, a fase seguinte).

## O que fazer

1. Perguntar e registrar `cadencia` (`DIARIA`/`SEMANAL`/`QUINZENAL`/
   `MENSAL`), `responsaveis` (mínimo 1) e `canais` de comunicação
   (mínimo 1 — ex.: "whatsapp", "email").
2. Perguntar `indicadores` que o usuário já acompanha, se houver (pode
   ficar vazio).
3. `fusoHorario`: usar o que o usuário informar; se não informar,
   `America/Sao_Paulo` é o default do schema — não é uma decisão desta
   skill, é o valor já registrado em `modeloOperacionalSchema` (D10
   segue `DECISAO_REQUERIDA` para a política completa de fuso/retry).
4. Propor até 3 nomes de rotina (`rotinasPropostas`) com base no
   backlog e no modelo operacional — só os nomes aqui; benefício,
   dados necessários, consentimento, risco e reversibilidade de cada
   uma são registrados na fase MODO_ROTINA.

## Saída

Um objeto que valida contra `modeloOperacionalSchema`.
