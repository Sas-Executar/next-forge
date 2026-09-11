# Grafo de Dependências — Fase 0

Mapeia dependências reais (imports/`workspace:*`) entre os packages
agênticos do PR #1, e onde cada fase futura (1–9) do plano vai tocar. Não é
um grafo completo do monorepo (packages puramente de infraestrutura como
`@repo/auth`, `@repo/security`, `@repo/rate-limit` são citados só quando
relevantes).

## 1. Dependências declaradas (`package.json`, `workspace:*`)

```
@repo/agent-runtime
  ├─ @repo/application   (elegibilidade/next-action)
  ├─ @repo/database       (Prisma Client)
  ├─ @repo/domain         (máquinas de estado)
  ├─ @repo/schemas        (contratos Zod)
  └─ ai@^6.0.116           ← ALVO DA FASE 2 (trocar por @anthropic-ai/claude-agent-sdk)

@repo/application
  └─ (sem workspace deps agênticas diretas — lógica pura sobre tipos de @repo/schemas)

@repo/domain
  └─ (sem workspace deps — máquinas de estado puras)

@repo/routines
  ├─ @repo/database
  ├─ @repo/domain
  └─ @repo/schemas

@repo/mcp
  ├─ @repo/database       (forWorkspace, RLS-scoped)
  ├─ @modelcontextprotocol/sdk
  └─ (tools internamente chamam guards de @repo/domain via camadas de apps/api)

@repo/scanner
  └─ (zero deps de ONNX/câmera por design — lógica pura, plataforma-agnóstica)

apps/mobile (scanner feature)
  └─ onnxruntime-react-native   ← integra @repo/scanner + modelo real (REC-006)

@repo/mapa-os
  ├─ @repo/database
  └─ @repo/domain (indireto, via tipos de Task/Routine)

apps/api
  ├─ @repo/agent-runtime  (rota /copilot/command)
  ├─ @repo/mcp            (rota /mcp)
  ├─ @repo/routines       (rota /cron/routines)
  ├─ @repo/mapa-os        (rota /mapa-os)
  ├─ @repo/reports        (rota /reports/generate)
  ├─ @repo/scanner        (rotas /scanner/*)
  └─ @repo/integrations   (webhooks gmail/outlook/whatsapp)

apps/app
  ├─ @repo/agent-runtime  (indireto — chama a mesma rota de apps/api ou local)
  ├─ @repo/ai             (rota /api/chat, streamText — NÃO usa agent-runtime)
  └─ @repo/design-tokens → @repo/design-system
```

## 2. Onde cada fase futura entra no grafo

| Fase | Novo nó / aresta | Impacto |
|---|---|---|
| 1 | `@repo/schemas` ganha `HandoffEnvelope`, `FaseAtivacao`, `PerfilOperacional`, `FonteAutorizada`, `ModeloOperacional`; `@repo/domain` ganha a máquina da Camada 1 | Aditivo — não deveria quebrar `@repo/agent-runtime` (Camada 2), mas ambos passam a depender de um `@repo/schemas` maior. Testar isolamento. |
| 2 | `@repo/agent-runtime` troca `ai` → `@anthropic-ai/claude-agent-sdk` | **Único pacote com edge de saída externa trocada.** Todo consumidor de `@repo/agent-runtime` (`apps/api/app/copilot/command`, `apps/app/app/api/chat`? — conferir se chat usa `@repo/ai` diretamente, não `@repo/agent-runtime`) precisa continuar funcionando com a mesma superfície pública. |
| 3 | Novo nó `apps/copiloto-runtime` (container) consome `@repo/agent-runtime` via `query()`; `apps/api` passa a fazer proxy pré-autenticado em vez de chamar `@repo/agent-runtime` in-process | **Muda a topologia de apps/api**: hoje `apps/api/app/copilot/command/route.ts` importa `@repo/agent-runtime` diretamente (in-process, serverless). Depois da Fase 3, essa rota vira um proxy HTTP para o container. Isso é uma mudança arquitetural real, não incremental — revisar se quebra o teste `api/__tests__/copilot-command.test.ts` (atualmente 3 testes passando). |
| 4 | Novo pacote `packages/copiloto-skills`; hooks/tools MCP in-process ganham `tenant_id` do closure do servidor | `@repo/mcp` ganha uma dependência de contexto de tenant mais rígida — os 12 tools atuais precisam ser revisados para o padrão de closure descrito no plano §6.5. |
| 5 | Orquestrador determinístico da Camada 1 consome `@repo/schemas` (Fase 1) + `@repo/agent-runtime` (Fase 2/3) | Ponto de integração das duas camadas — é onde o "mapa explícito" do plano §6.1 vira código real. |
| 6 | `packages/copiloto-skills` populado; rotas pt-BR em `apps/app`/`apps/mobile` | Renomeação de rotas (C15) — precisa de redirects; `apps/mobile` tem telas com os mesmos nomes em inglês hoje (`copilot.tsx`, `mapa-os.tsx` já em pt-BR parcialmente). |
| 7 | Nova tela Scroll Task em `apps/app`/`apps/mobile`, consumindo `@repo/application` (eligibility/next-action) | Não deveria exigir mudança em `@repo/application`, só um novo consumidor. |
| 8 | `apps/mobile` scanner passa a rodar `session.run()` real | Não muda o grafo de packages — fecha `REC-006` dentro do nó existente `apps/mobile`. |
| 9 | OTEL no container; `packages/feature-flags` ganha `showCopiloto` | `apps/copiloto-runtime` (Fase 3) ganha aresta para `@repo/observability`. |

## 3. Ciclo de risco mais alto identificado

**`@repo/agent-runtime` é o nó central de risco.** Ele é o único pacote
tocado por D2 (Fase 2, troca de SDK) *e* pela mudança de topologia da Fase 3
(de in-process para container remoto) *e* pela integração da Fase 5
(orquestrador da Camada 1). As 37 asserções de teste hoje verdes
(`__tests__/{commands,evals,format,output-schema,phases}.test.ts`, 33
passando + 4 skip) são o único contrato de regressão que amarra essas três
fases entre si — reforça a recomendação do próprio plano de tratá-las como
"contrato de regressão", não como suíte a ser reescrita.

## 4. Nós sem aresta agêntica (fora do escopo D1–D6, citados por completude)

`@repo/billing`, `@repo/design-tokens`, `@repo/analytics`,
`@repo/observability` (exceto Fase 9), `@repo/payments`, `@repo/webhooks`
(exceto integrations) — não são tocados pelas Fases 1–9 do plano e não
precisam de auditoria adicional nesta rodada.
