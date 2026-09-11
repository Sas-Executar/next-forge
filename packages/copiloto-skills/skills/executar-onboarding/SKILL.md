---
name: executar-onboarding
description: Conduz a fase ONBOARDING da Camada 1 (Ativação) do Executar — identidade, objetivos, restrições e solicitação de autorizações de fontes externas. Aciona quando um workspace novo inicia a jornada de ativação, ou quando o usuário pede para reconfigurar seu perfil operacional.
---

# executar-onboarding

**Aviso de proveniência (Fase 6, D5):** este é conteúdo original em
pt-BR, escrito para o domínio real já implementado neste repositório
(`packages/schemas/src/ativacao.ts`, `PerfilOperacional`) — **não** é
uma tradução do plugin `productivity` da Anthropic. O plano original
(D5) previa forkar/traduzir esse plugin, mas seu conteúdo completo
(SKILL.md de cada skill) não está acessível a partir desta sessão —
apenas metadados (nome, descrição, lista de skills) via
`SearchPlugins`. Registrado como limitação real, não contornado
silenciosamente. Se o conteúdo do plugin for disponibilizado a uma
sessão futura, esta skill deve ser revisada contra ele, não descartada.

## Papel

Primeira etapa da Camada 1 (`FaseAtivacao.ONBOARDING`,
`packages/schemas/src/ativacao.ts`). Roda uma única vez por tenant.
Produz um `PerfilOperacional` válido — nada além disso.

## O que fazer

1. Perguntar, em português, e registrar:
   - Nome de exibição do workspace/time (`nomeExibicao`).
   - Objetivos de curto prazo, em linguagem do usuário, não jargão de
     produto (`objetivos`, mínimo 1).
   - Restrições relevantes — horários, canais indisponíveis, temas fora
     de escopo (`restricoes`, pode ficar vazio).
   - Apelidos/atalhos verbais que o usuário já usa para pessoas,
     projetos ou termos recorrentes (`idsVerbais`).
2. Perguntar quais fontes externas o usuário quer eventualmente
   conectar (Gmail, Outlook, WhatsApp, Google Calendar, Outlook
   Calendar — os únicos providers que `FonteAutorizadaProvider` já
   modela). Registrar como `autorizacoesSolicitadas`: **pedido**, não
   concessão — a concessão real acontece na fase SCANNER seguinte,
   nunca aqui.
3. Nunca ler dados de nenhuma fonte externa nesta fase — não há
   autorização concedida ainda, só solicitada.

## Limites (regra de autoridade)

- Sem acesso a dados externos.
- Não decide nada em nome do usuário — só coleta e confirma de volta o
  que foi dito, em português, antes de produzir o `HandoffEnvelope`
  para a fase SCANNER.

## Saída

Um objeto que valida contra `perfilOperacionalSchema`
(`packages/schemas/src/ativacao.ts`). O runtime
(`apps/copiloto-runtime/src/ativacao.ts`, `runFaseAtivacao`) é quem
efetivamente chama o modelo com `outputFormat` fixado nesse schema —
esta skill descreve o comportamento esperado dentro dessa chamada, não
substitui a validação.
