# Plano de Segurança e Permissões — Fase 0 (saída)

## 1. O que já existe e está testado (não tocar sem motivo)

- **RLS por workspace**: `packages/database/__tests__/rls.test.ts` — 89
  testes, `describe.skipIf(!process.env.DATABASE_URL)` (100% skip nesta
  sessão sandbox, comportamento correto). `forWorkspace(workspaceId)` é o
  único client usado nos tools MCP (`packages/mcp/src/server.ts`).
- **Matriz de permissões de app**: `packages/auth/__tests__/permissions.test.ts`
  — 17 testes, 100% passando (não depende de credencial externa).
- **Autoridade de domínio**: `canTransitionTask` e equivalentes negam
  DOING/VERIFY/DONE para `actor: "AGENT"` — confirmado por comentário do
  próprio `packages/mcp/src/server.ts`, retornando `HUMAN_REQUIRED`.
- **Auditoria universal de tool MCP**: `logToolCall()` grava `AuditEvent`
  para toda chamada, sucesso ou falha, incondicionalmente — não é
  opt-in por tool.
- **Segredos**: `security.yml` (TruffleHog) roda em todo push; nenhum
  segredo real commitado (verificado pela sessão que escreveu
  `HANDOFF.md` §3.1; não re-verificado nesta Fase 0 por não ter havido
  nenhum commit de produto ainda).

## 2. O que esta auditoria não conseguiu verificar

- **Gate MCP `QST-03`** (credencial por usuário final bloqueando 70/157
  tools): número "157" não existe em nenhum arquivo deste repositório —
  só é citado no plano/prompt, que por sua vez cita o Blueprint (fora de
  escopo). O que é verificável: hoje há **12 tools MCP reais**, nenhuma
  delas bloqueada por esse gate porque o catálogo de 157 nunca foi
  incorporado (`packages/mcp/src/server.ts`, comentário próprio confirma).
- **Modelo de consentimento por conector**: `IntegrationConnection`
  (Prisma) registra a conexão, mas nenhuma política de consentimento
  (expiração, escopo, revogação) foi encontrada como lógica testada em
  `packages/integrations/`. Verificar `connections.ts` com mais
  profundidade é trabalho de Fase 4, não desta Fase 0 (que é auditoria de
  superfície, não implementação).

## 3. Plano de segurança por fase futura (não implementar agora)

| Fase | O que precisa de decisão/implementação de segurança |
|---|---|
| 2 | `ANTHROPIC_API_KEY` só no ambiente do runtime (container), nunca no client — regra já no plano §9, reforçar no PR da Fase 2. |
| 3 | Isolamento multi-tenant do Agent SDK: `settingSources: []`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `CLAUDE_CONFIG_DIR` por tenant, `cwd` por tenant em toda chamada `query()` — nenhum destes existe ainda porque o Agent SDK não está integrado. |
| 4 | `tenant_id`/`user_id` **do closure do servidor MCP, nunca do argumento do modelo** — os 12 tools atuais já seguem esse padrão via `McpToolContext` (bound por request, não por argumento) — confirmar que isso continua true ao adicionar novas tools. `PreToolUse` hooks negando escrita fora de etapa/scanner. |
| 4 | Resolver D9a (consentimento das 12 tools reais) — decisão do usuário, não bloqueada por falta de código. |
| 9 | Rate limit por tenant (`@repo/rate-limit`, já existe, reusar); Arcjet na borda (`@repo/security`, já existe, reusar) — nenhuma mudança de pacote, só de configuração aplicada ao novo runtime. |

## 4. Regra de não-decisão aplicada aqui

Nenhuma tool MCP nova, nenhum hook, nenhuma mudança de `permissionMode`
foi criada nesta Fase 0 — essa é uma regra explícita do prompt de
ativação ("sem alterar código de produto"). Este documento é só o mapa do
que a Fase 4 precisa decidir e verificar, baseado no que já existe e já
está testado.
