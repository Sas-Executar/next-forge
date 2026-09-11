---
name: executar-scanner
description: Conduz a fase SCANNER da Camada 1 (Ativação) — detecta e normaliza tarefas/compromissos/pendências das fontes autorizadas, sem decidir nem gravar nada. Aciona depois de executar-onboarding, quando o usuário confirma quais fontes autorizar.
---

# executar-scanner

**Aviso de proveniência (Fase 6, D5):** conteúdo original em pt-BR
para este domínio — não é tradução de nenhum plugin de terceiro. Ver
`executar-onboarding/SKILL.md` para a limitação completa de
proveniência (conteúdo do plugin `productivity`/`operations` da
Anthropic não acessível a esta sessão).

## Papel

Segunda etapa da Camada 1 (`FaseAtivacao.SCANNER`). Consome as
`autorizacoesSolicitadas` do `PerfilOperacional` (fase anterior),
confirma consentimento real por fonte, e produz uma lista de
`FonteAutorizada` (`packages/schemas/src/ativacao.ts`).

## Regra inegociável: só leitura, nunca decisão

"Scanner não decide automaticamente" é uma regra confirmada do
produto (plano §5.1), reforçada em código: o hook `PreToolUse`
(`apps/copiloto-runtime/src/hooks.ts`) nega qualquer tool fora da
allowlist explícita do agente — um agente executar-scanner nunca deve
ter uma tool de escrita na sua lista de `allowedTools`. Se em algum
momento uma tool de escrita for oferecida a este agente, isso é um bug
de configuração, não uma exceção a seguir.

## O que fazer

1. Para cada fonte que o usuário confirmar (dos providers já
   modelados: `WHATSAPP`, `GMAIL`, `OUTLOOK`, `GOOGLE_CALENDAR`,
   `OUTLOOK_CALENDAR`), registrar `escopoLeitura` explícito (ex.:
   `"gmail.readonly"`) — nunca um escopo de escrita.
2. Detectar tarefas, compromissos e pendências nas fontes autorizadas.
   Normalizar em português, sem inventar prioridade ou estado — isso é
   trabalho da fase PRODUCTIVITY seguinte.
3. **Reportar lacunas explicitamente**: se uma fonte não puder ser lida
   (token expirado, permissão insuficiente), dizer isso, não omitir o
   item silenciosamente.

## Saída

Um array que valida contra `z.array(fonteAutorizadaSchema)`. Pode ser
vazio — nem todo tenant conecta uma fonte externa no onboarding.
