# ADR-001 — Supersessão Supabase → Neon+Prisma

| Campo | Valor |
|---|---|
| **Status** | Proposto (candidato — produzido na Fase 0, aguarda ratificação) |
| **Relacionado** | REC-001 (HIGH), C11, D4 |
| **Data** | 2026-09-11 |

## Contexto

`AGENTS.md` (raiz deste repositório) já declara: *"Do not introduce
Supabase, or bind canonical application state to Google Drive or any
document store, without an ADR in the Blueprint that explicitly supersedes
this section."* O corpus original do Executar (Blueprint) menciona Supabase
em pontos que `REC-001` classifica como HIGH — inconsistência ainda não
formalizada como ADR.

## Verificação nesta sessão

Busca recursiva por "supabase" (case-insensitive) em `packages/`, `apps/`
fora de `node_modules`: nenhuma ocorrência de uso real (biblioteca,
variável de ambiente, cliente). O único backend de dados real e em uso é
`packages/database` (Prisma + Postgres/Neon), com `relationMode:
"foreignKeys"` — um desvio deliberado do default do template Next Forge,
documentado em `AGENTS.md` como decisão já tomada, não candidata.

## Decisão

**Neon Postgres + Prisma (`packages/database`) é a única camada de dados
canônica deste produto.** Supabase nunca foi adotado em código; qualquer
menção a Supabase em documentos do Blueprint é tratada como andaime não
ratificado (scaffolding), não como arquitetura vigente — exatamente como
`AGENTS.md` já registra.

## Consequências

- Nenhuma mudança de código é necessária para efetivar esta decisão — ela
  já é o estado real.
- Este ADR formaliza, para fins de rastreabilidade (`ADR-*` citável em
  commits/PRs, conforme `AGENTS.md`), o que já era verdade na prática.
- Uma eventual atualização do Blueprint para remover as menções
  remanescentes a Supabase é trabalho do Blueprint (repositório separado,
  read-only daqui), não deste repositório — conforme `PRODUCT_AUDIT.md`
  §"M20-T03".

## Status de ratificação

Candidato — precisa de aprovação explícita do usuário antes de ser
promovido a "Aceito", por ser um ADR que toca uma reconciliação `HIGH`.
