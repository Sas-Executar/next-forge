# Plano de Schemas e Migrações — Fase 0 (saída)

## 1. Estado real do schema hoje

`packages/database/prisma/schema.prisma`: **30 `model` + 16 `enum`**
(contagem exata desta auditoria, não "~37" como o plano original
aproximava). `relationMode: "foreignKeys"` — desvio deliberado do default
Next Forge, já documentado em `AGENTS.md`.

Modelos existentes (lista completa, confirmada por grep):
`Page` (stub herdado de `main`), `Workspace`, `Membership`, `Project`,
`Process`, `Deliverable`, `Task`, `Action`, `Evidence`, `Dependency`,
`Routine`, `RoutineRun`, `WorkflowDefinition`, `WorkflowRun`,
`StatusReport`, `MapaOS`, `VisualSymbol`, `ScannerMutation`, `Attachment`,
`IntegrationConnection`, `ExternalObjectRef`, `AgentRun`, `ToolCall`,
`AIUsage`, `TelemetryEvent`, `Notification`, `Subscription`,
`UsageLedger`, `ExecutionCredit`, `AuditEvent`.

`LAUNCH_RUNBOOK.md` §1 afirma 8 migrations já aplicadas contra o banco de
produção real (Neon `snowy-dawn-65785764`) via MCP Neon — **não
reverificado nesta sessão** (sandbox sem acesso a esse MCP/credencial);
tratado como fonte confiável por ter sido verificado com `get_database_tables`
na sessão que o produziu.

> **Correção (Fase 3, 2026-09-11):** a afirmação original deste
> documento — "`prisma/migrations/` está vazio no código-fonte deste
> branch" (§3, abaixo) — **estava errada**. Foi escrita sem rodar `ls`
> antes de afirmar. `packages/database/prisma/migrations/` contém, de
> fato, os 8 diretórios de migration reais (`20260909145747_init` até
> `20260910120500_integration_system_job_discovery`), incluindo
> `20260909173722_enable_rls` com as políticas RLS completas. Não há
> divergência a resolver: os arquivos estão commitados, coerentes com o
> que `LAUNCH_RUNBOOK.md` diz ter sido aplicado. A "Regra a seguir" e a
> "Recomendação" da seção 3 (abaixo) não se aplicam mais — mantidas
> riscadas, não apagadas, para não esconder o erro original.

## 2. O que a Fase 1 precisa adicionar (sem migração ainda)

Tipos Zod em `packages/schemas` (TypeScript puro, sem tocar o Prisma
schema): `HandoffEnvelope`, `FaseAtivacao`, `PerfilOperacional`,
`FonteAutorizada`, `ModeloOperacional`. Isso é aditivo e **não exige uma
migration** — são contratos de aplicação, não modelos de banco, até que a
Fase 1/5 decida que algum desses precisa de persistência própria (ex.:
`PerfilOperacional` provavelmente vira um model Prisma na Fase 5, não na
Fase 1).

## 3. Migrações previstas por fase (não executar nesta Fase 0)

| Fase | Migration prevista | Motivo |
|---|---|---|
| 1 | Nenhuma (só tipos TS) | Contratos ainda não persistidos |
| 4 | Modelos para Modo Rotina nomeado (se a máquina normativa exigir campos que `Routine`/`RoutineRun` não têm hoje) | Depende de D10 |
| 5 | Modelo(s) para `PerfilOperacional`, `FonteAutorizada` consolidados, se decidido que a Camada 1 precisa de persistência própria em vez de reusar `IntegrationConnection`/`Workspace` | Depende do desenho da Fase 5 |
| 8 | Nenhuma — `VisualSymbol`/`ScannerMutation` já existem | REC-006 é sobre execução do modelo ONNX, não sobre schema |

~~**Regra a seguir em todas**: "primeira migration do repositório" —
`prisma/migrations/` está vazio no código-fonte deste branch (as 8
migrations de `LAUNCH_RUNBOOK.md` foram aplicadas diretamente contra o
banco real via MCP, não commitadas como arquivos `prisma/migrations/*` no
Git — **isto é uma divergência a resolver antes da Fase 1**: uma migration
aplicada sem arquivo commitado quebra `prisma migrate deploy` em qualquer
ambiente novo. Recomendação: a próxima sessão deve rodar `prisma migrate
diff`/`prisma db pull` contra o schema atual para gerar os arquivos de
migration retroativamente, ou confirmar com o usuário se isso já foi
feito fora deste branch.~~ **Errado — ver a correção no topo desta
seção.** Os 8 diretórios de migration existem no repositório; a regra
real (já seguida por todas as 8) é simplesmente: toda mudança de schema
ganha seu próprio `prisma/migrations/<timestamp>_<nome>/migration.sql`,
nunca aplicada diretamente sem arquivo commitado.

## 4. `Page` (stub)

O model `Page` (herdado de `main`, o template Next Forge puro) continua no
schema. Nenhuma fase do plano pede sua remoção; manter até uma decisão
explícita — remover um model sem necessidade também é uma mudança
estrutural que exige justificativa, não só limpeza.

## 5. Verificação de integridade recomendada antes da Fase 1

1. Confirmar se `prisma/migrations/` deveria existir localmente (ver §3).
2. Rodar `bunx prisma validate` (não rodado nesta Fase 0 — não altera
   arquivos, mas não foi verificado por não ser parte do baseline de teste
   padrão do CI).
3. Nenhuma migração deve ser aplicada contra o banco de produção real
   nesta Fase 0 nem nas Fases 1 sem aprovação explícita — regra do próprio
   prompt de ativação ("Não rode migrações contra banco de produção").
