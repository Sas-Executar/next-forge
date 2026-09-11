# ADR-003 — Conciliação AGENT-FLOW-001 × Visão Sistêmica Normativa

| Campo | Valor |
|---|---|
| **Status** | Proposto (candidato) |
| **Relacionado** | C16, D3 |
| **Data** | 2026-09-11 |

## Contexto

Duas sequências de fases coexistem nas fontes: `AGENT-FLOW-001` (10 fases:
SYNC→UNDERSTAND→STRUCTURE→VISUALIZE→PRE_APPROVE→DECOMPOSE→EXECUTE→
RECONCILE→REPORT→REPLAN) já implementado em código, e a "Visão Sistêmica
Normativa" (Onboarding→Scanner→Productivity→Operations→Modo
Rotina→1º Entregável), uma jornada de ativação declarada pelo usuário como
decisão funcional. D3 já decidiu que são duas camadas conciliadas, não uma
substituindo a outra — este ADR formaliza o mapa entre elas.

## Verificação nesta sessão

- `packages/agent-runtime/src/phases.ts`: `AGENT_FLOW_PHASES` existe
  literalmente com as 10 fases citadas, mais a regra codificada
  `REPLAN_RETURNS_TO = "VISUALIZE"` — a única regra estrutural do fluxo
  que o comentário do próprio arquivo diz ser "enforçável" (as demais são
  descritas em prosa na spec, não como FSM completa).
  5 comandos determinísticos (`bomdia`/`agora`/`estado`/`fechardia`/
  `replanejamento`) já roteiam por essas fases.
- Nenhuma fase da Visão Normativa (`Onboarding`, `Scanner` como etapa de
  ativação, `Productivity`, `Operations`, `Modo Rotina`, `1º Entregável`)
  existe como enum, tipo ou máquina de estados em `packages/domain` ou
  `packages/schemas`. É 100% trabalho futuro (Fases 1 e 5 do plano).

## Decisão

Adotar o mapa de conciliação já proposto no plano (§6.1), formalizado aqui:

```
CAMADA 1 — Ativação (uma vez por tenant) · Visão Sistêmica Normativa
  Onboarding → Scanner → Productivity → Operations → Modo Rotina → 1º Entregável
        │
        ▼  produz: PerfilOperacional, FonteAutorizada, Backlog inicial,
                     ModeloOperacional, 3 Rotinas propostas, 1º Entregável
CAMADA 2 — Operação contínua (recorrente) · AGENT-FLOW-001 (já implementado)
  SYNC → UNDERSTAND → STRUCTURE → VISUALIZE → PRE_APPROVE → DECOMPOSE
       → EXECUTE → RECONCILE → REPORT → REPLAN ──(gate)──▶ VISUALIZE
```

Mapeamento explícito: `Scanner (ativação) → SYNC/UNDERSTAND`,
`Productivity → STRUCTURE/DECOMPOSE`, `Operations → VISUALIZE/PRE_APPROVE`,
`1º Entregável → REPORT`, `Modo Rotina →` agendador que dispara a Camada 2
recorrentemente. A Camada 1 **não substitui** `AGENT_FLOW_PHASES`; adiciona
um estágio `ATIVACAO` anterior, com seu próprio enum em `packages/schemas`
(Fase 1).

## Consequências

- `AGENT_FLOW_PHASES` (Camada 2) permanece intocado — nenhuma mudança
  necessária no código já testado (33 testes passando).
- A Camada 1 é implementada como orquestração determinística separada
  (Fase 1 + Fase 5), não como extensão do enum `AgentFlowPhase` existente.
- `HandoffEnvelope` (Fase 1) é o contrato que conecta a saída da Camada 1
  à entrada da Camada 2 — precisa validar que o formato de saída de
  "1º Entregável" é consumível como entrada de `SYNC`.

## Status de ratificação

Candidato — pendente de aprovação do usuário antes da Fase 1.
