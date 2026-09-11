# Plano de Testes e Evals — Fase 0 (saída)

## 1. Linha de base real (repetido de `DIAGNOSTICO_REPOSITORIO.md`, fonte única)

```
typecheck : 37/37 pacotes, 0 erros
lint      : 659 arquivos, 0 erros, 0 avisos (bunx ultracite check .)
test      : 422 testes totais — 281 passando, 141 pulando, 0 falhando
            18/18 pacotes com task `test`, todos com sucesso
```

Este é o número contra o qual toda fase futura é comparada — não um
número aproximado dos documentos herdados (que citavam 259/141).

## 2. Cobertura por camada (mapeando o plano §8 ao código real)

| Camada | Cobertura hoje | Evidência |
|---|---|---|
| Regressão do PR #1 | Linha de base acima, registrada nesta Fase 0 | `bun run test` completo |
| Contratos (Camada 2) | `output-schema.test.ts` (8 testes), `phases.test.ts` (3) | `packages/agent-runtime/__tests__/` |
| Contratos (Camada 1) | **Nenhum — ainda não existe código** | Fase 1 cria os testes junto com os tipos |
| Tools MCP | `__tests__/{tasks,projects,context}.test.ts` — **9 testes, 100% skip** (sem `DATABASE_URL`) | `packages/mcp/__tests__/` |
| Hooks/permissões | `authority-gate.test.ts` (6 testes, `packages/routines`); `permissions.test.ts` (17 testes, `packages/auth`) | Cobrem autoridade de domínio, não hooks do Agent SDK (que não existe ainda) |
| Orquestração | `phases.test.ts` cobre a regra `REPLAN_RETURNS_TO`; não cobre a ordem completa como FSM (o próprio código documenta que não é uma FSM completa) | `packages/agent-runtime/src/phases.ts` comentário |
| Runtime (`query()`/resume) | **Nenhum — Agent SDK não integrado ainda** | Fase 2/3 |
| Rota/API | `api/__tests__/*.test.ts` — 18 testes, 6 arquivos, 100% passando | `apps/api/__tests__/` |
| Evals | `evals/{datasets,regression,adversarial}/*.jsonl` — **17 casos reais** (6+5+6), não 18 como `HANDOFF.md` cita (divergência de 1, não investigada, baixo risco) | `packages/agent-runtime/src/evals/`; `__tests__/evals.test.ts` (19 testes incl. 1 skip) |

## 3. O que falta criar, por fase (não criar agora)

- **Fase 1**: testes de transição válida/inválida para a máquina de
  estados da Camada 1 (novo `packages/domain` ou arquivo dedicado).
- **Fase 2**: nenhum teste novo deveria ser necessário — a suíte existente
  é o contrato; se a migração exigir um teste novo, é sinal de que a
  superfície pública mudou (o que a Fase 2 deveria evitar).
- **Fase 3**: teste de integração real contra o container
  (`apps/copiloto-runtime`) — não é vitest puro, precisa de um harness
  novo (Docker/testcontainers ou equivalente); decidir a ferramenta é
  trabalho da própria Fase 3, não desta Fase 0.
- **Fase 4**: os 4 testes negativos explícitos já listados em
  `PLANO_IMPLEMENTACAO_INCREMENTAL.md` (scanner não grava, rotina não
  ativa sem confirmação, `tenant_id` forjado ignorado, cron idempotente).
- **Fase 7**: teste de UI para o Scroll Task garantindo "auto-scroll nunca
  marca conclusão automaticamente" como teste automatizado, não só
  princípio de design.
- **Fase 8**: benchmark real (não é um teste pass/fail, é uma medição —
  registrar p95 como artefato, não como asserção binária a menos que uma
  meta seja formalizada).
- **Fase 9**: ampliar `evals/{golden,regression,adversarial}.jsonl` além
  dos 17 casos atuais; nenhum CI de teste dedicado existe hoje além de
  `ci.yml`'s job `test` — propor um workflow de eval separado é trabalho
  de Fase 9, não desta auditoria.

## 4. Gate de evals (já real, preservar)

`packages/agent-runtime/src/evals/graders.ts` — 2 graders binários
(`schema`, `forbidden_absent`), sem tolerância ponderada por severidade
(`QUALITY_GATES.md` já documenta isso como deliberado, dataset pequeno
demais para calibração). Nenhuma fase deste plano deve introduzir
tolerância parcial sem antes o dataset crescer o suficiente para
justificar — é uma decisão já tomada, não uma lacuna a preencher às
pressas.

## 5. Regra de aceite entre fases (reforça `AGENTS.md`)

Toda fase termina com `bun run check` (lint) + `bun run typecheck` +
`turbo test` verdes, comparados a este baseline — nunca "deveria passar",
sempre rodado e conferido antes de declarar a fase concluída (escada de
maturidade: `implementado ≠ testado ≠ verificado`).
