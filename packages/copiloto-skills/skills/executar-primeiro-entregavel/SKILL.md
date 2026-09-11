---
name: executar-primeiro-entregavel
description: Conduz a fase PRIMEIRO_ENTREGAVEL, a última da Camada 1 — consolida onboarding, scanner, backlog, modelo operacional e rotinas confirmadas em um único entregável, e propõe os próximos passos para a Camada 2 (operação contínua) assumir. Aciona depois que as 3 rotinas propostas forem confirmadas.
---

# executar-primeiro-entregavel

**Aviso de proveniência (Fase 6, D5):** conteúdo original em pt-BR. O
"template oficial único" citado no plano (§7, Fase 5) não está
acessível a esta sessão — `primeiroEntregavelSchema`
(`packages/schemas/src/ativacao.ts`) é uma reconstrução a partir da
própria frase do plano ("consolida onboarding + scanner + backlog +
configuração operacional + status + 3 rotinas + próximos passos"), não
uma cópia do template real. Se o template real aparecer, substituir
este schema por ele — não ajustar o schema ao redor dele.

## Papel

Sexta e última etapa da Camada 1 (`FaseAtivacao.PRIMEIRO_ENTREGAVEL`).
Consolida tudo o que as 5 fases anteriores produziram em um
`PrimeiroEntregavel` (`packages/schemas/src/ativacao.ts`) — "sem
alternativas", ou seja: não inventar um segundo formato de entregável
para casos "diferentes".

## O que fazer

1. Reunir, sem reinterpretar: `PerfilOperacional` (ONBOARDING),
   `FonteAutorizada[]` (SCANNER), `BacklogInicial` (PRODUCTIVITY),
   `ModeloOperacional` (OPERATIONS), e as 3 `rotinasConfirmadas`
   (MODO_ROTINA, já em `CONFIRMADO`).
2. Propor `proximosPassos` (mínimo 1) — ações concretas que a Camada 2
   (AGENT-FLOW-001, já implementada em `packages/agent-runtime`) vai
   executar a partir daqui.
3. Apresentar o entregável ao usuário em português, no formato do
   bloco fixo já usado pelos comandos da Camada 2 (AGORA / TEMPO /
   CONCLUI QUANDO / EVIDÊNCIA / PRÓXIMA — `formatOrchestratorOutputText`,
   `packages/agent-runtime/src/format.ts`) quando fizer sentido, sem
   forçar a semelhança onde o conteúdo é estrutural, não uma ação
   única.

## Depois desta fase

`FaseAtivacao` avança para `CONCLUIDA` — a Camada 1 termina, e a
operação contínua (Camada 2, `AGENT_FLOW_PHASES`) assume, disparada
pelo Modo Rotina confirmado. Este handoff entre camadas é o mapa
registrado em `docs/executar/ADRS_CANDIDATOS/
ADR-003-agent-flow-visao-normativa.md`.

## Saída

Um objeto que valida contra `primeiroEntregavelSchema`.
