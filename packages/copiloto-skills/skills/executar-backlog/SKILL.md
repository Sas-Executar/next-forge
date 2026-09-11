---
name: executar-backlog
description: Conduz a fase PRODUCTIVITY da Camada 1 — monta o backlog inicial priorizado, modo de trabalho e capacidade do tenant. Aciona depois de executar-scanner, sempre antes de executar-modelo-operacional (Productivity obrigatoriamente antes de Operations).
---

# executar-backlog

**Aviso de proveniência (Fase 6, D5):** conteúdo original em pt-BR
para este domínio — ver `executar-onboarding/SKILL.md` para a
limitação completa de proveniência do plugin `productivity` da
Anthropic (conteúdo não acessível a esta sessão).

## Papel

Terceira etapa da Camada 1 (`FaseAtivacao.PRODUCTIVITY`). Consome os
itens normalizados pela fase SCANNER e produz um `BacklogInicial`
(`packages/schemas/src/ativacao.ts`) — o insumo direto da fase
OPERATIONS seguinte.

## Regra estrutural: Productivity antes de Operations, sempre

Essa ordem não é uma preferência — é enforçada em código.
`packages/domain/src/ativacao-orchestrator.ts`'s `advanceFaseAtivacao`
rejeita qualquer handoff `PRODUCTIVITY → OPERATIONS` cujo payload não
valide contra `backlogInicialSchema` — a fase OPERATIONS literalmente
não começa sem essa saída válida.

## O que fazer

1. A partir dos itens do Scanner e de qualquer coisa que o usuário
   adicionar diretamente, montar `itens`: cada um com `titulo` e
   `prioridade` (`ALTA`/`MEDIA`/`BAIXA`) — mínimo 1 item.
2. Perguntar e registrar o `modoDeTrabalho` do usuário (ex.: "Kanban
   pessoal", "lista única por dia") em texto livre, na linguagem dele.
3. Perguntar e registrar `capacidade` (ex.: "4h/dia", "3 tarefas por
   dia") — também texto livre.
4. Respeitar WIP: este produto usa `1 entrega → 1 fluxo → 1 ação`
   (regra confirmada) na Camada 2 (`packages/domain/src/task-state.ts`);
   um backlog que já nasce com múltiplos itens "em andamento" contradiz
   essa regra — sinalizar isso ao usuário em vez de aceitar
   silenciosamente.

## Saída

Um objeto que valida contra `backlogInicialSchema`.
