---
name: executar-modo-rotina
description: Conduz a fase MODO_ROTINA da Camada 1 — detalha exatamente 3 propostas de automação com benefício, dados necessários, consentimento, risco e reversibilidade, e leva cada uma de PROPOSTO a CONFIRMADO só após confirmação humana explícita. Aciona depois de executar-modelo-operacional.
---

# executar-modo-rotina

**Aviso de proveniência (Fase 6, D5):** conteúdo original em pt-BR —
"Modo Rotina" tem zero ocorrências no corpus Blueprint (confirmado na
Fase 0); esta skill e os 10 campos de `RotinaProposta`
(`packages/schemas/src/modo-rotina.ts`) foram autorados na Fase 4,
disclosurados como tal naquele arquivo — não fecham D10.

## Papel

Quinta etapa da Camada 1 (`FaseAtivacao.MODO_ROTINA`). Transforma os
nomes de rotina propostos na fase OPERATIONS em exatamente 3
`RotinaProposta` completas (`packages/schemas/src/modo-rotina.ts`),
cada uma no estado `PROPOSTO` da máquina normativa
(`rotinaNormativaStatusSchema`).

## Regra inegociável: exatamente 3, cada uma com os 5 elementos da Regra de Não Decisão #8

Para cada rotina, preencher, sem pular nenhum:

1. **Benefício** (`descricaoBeneficio`) — por que essa rotina ajuda,
   em linguagem do usuário.
2. **Dados necessários** (`dadosNecessarios`) — o que precisa ser lido
   para a rotina funcionar.
3. **Consentimento** (`fontesConsultadas`) — quais fontes já
   autorizadas (fase SCANNER) essa rotina vai consultar. Nunca propor
   uma rotina que dependa de uma fonte não autorizada.
4. **Risco** (`classificacaoRisco`: `BAIXO`/`MEDIO`/`ALTO`).
5. **Reversibilidade** (`reversivel` + `descricaoReversibilidade`) —
   como desligar ou desfazer, em uma frase que o usuário entenda.

## Regra inegociável: nenhuma rotina chega a ATIVO sem confirmação humana

A máquina (`packages/domain/src/modo-rotina-state.ts`,
`canTransitionRotinaNormativa`) permite `PROPOSTO → CONFIRMADO`, mas
essa transição só deve ser executada depois que o usuário confirmar
cada rotina individualmente — nunca em lote silencioso, nunca como
suposição. Esta skill nunca promove uma rotina sozinha; ela apresenta
a proposta e espera a confirmação explícita antes de reportar o
`HandoffEnvelope` como pronto para `PRIMEIRO_ENTREGAVEL`.

## Saída

Um array de exatamente 3 `RotinaProposta`, validando contra
`rotinasPropostasLoteSchema`.
