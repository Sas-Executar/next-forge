# Plano de Observabilidade e Operação — Fase 0 (saída)

## 1. O que já existe (Camada 2 / infraestrutura geral)

- `packages/observability`: `log`, `parseError`, trace schema, business
  events, AI cost — 15 testes passando, 4 pulando (`describe.skipIf`)
  (`__tests__/{ai-cost,trace,metrics-formulas,business-events,
  workspace-metrics}.test.ts`).
- `AgentRun`, `ToolCall`, `AIUsage`, `TelemetryEvent` já são models Prisma
  reais — a base de dados para custo por sessão e spans já existe no
  schema, mesmo sem o Agent SDK ainda gravando nela.
- `AuditEvent` (model Prisma) é a trilha de auditoria genérica, já em uso
  pelos 12 tools MCP via `logToolCall()`.

## 2. O que não existe ainda (não implementar nesta Fase 0)

- Nenhum span OTEL real — `CLAUDE_CODE_ENABLE_TELEMETRY`/exporters OTLP
  não aparecem em nenhum workflow ou `.env` de exemplo verificado.
- Nenhum container (`apps/copiloto-runtime`) para hospedar telemetria de
  sessão de agente — depende da Fase 3.
- `executar-nf-{app,web,api}` seguem em ERROR no Vercel por env vars
  ausentes (`REC-005`) — isso é ação humana (populaar env vars no
  dashboard Vercel), documentada em detalhe em `LAUNCH_RUNBOOK.md` §2, não
  algo que uma sessão de código resolve.

## 3. Plano por fase futura

| Fase | Observabilidade a adicionar |
|---|---|
| 3 | `SessionStore` → Postgres (obrigatório, doc do Agent SDK: sem isso, reiniciar o container perde o transcript); alerta em `mirror_error` se a gravação falhar. |
| 4 | Hooks `SessionStart` (abrir `AgentRun`, correlation id) / `PostToolUse` (`EventoAuditoria` com args redigidos) / `Stop` (persistir estado, custo) — todos mapeiam para models Prisma já existentes (`AgentRun`, `AuditEvent`), só falta o código do Agent SDK escrevendo neles. |
| 9 | OTEL real no container (`CLAUDE_CODE_ENABLE_TELEMETRY=1`, exporters OTLP); custo por sessão agregado de `AIUsage`; corrigir as env vars do `REC-005` (ação humana, checklist já existe em `LAUNCH_RUNBOOK.md`); feature flag `showCopiloto` via `packages/feature-flags` (`createFlag`), rollout tenant a tenant. |

## 4. Sem ação nesta Fase 0

Nenhuma variável de ambiente nova foi adicionada, nenhum workflow de CI
alterado, nenhuma configuração de OTEL criada — consistente com "sem
alterar código de produto" do prompt de ativação. Este documento é
puramente um mapa de lacunas para as Fases 3/4/9.
