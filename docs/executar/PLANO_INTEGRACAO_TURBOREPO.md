# Plano de Integração com o Turborepo — Fase 0 (saída)

## 1. Convenções reais do monorepo (confirmadas nesta auditoria)

- Sem build step, sem campo `exports` — TS cru resolvido por path alias
  `@repo/* → ../../packages/*` (confirmado: todo package novo do PR #1
  segue esse padrão, sem exceção encontrada).
- Cada package novo tem `package.json` com `private: true`,
  `version: "0.0.0"`, scripts `clean`/`typecheck`/`test` — confirmado em
  `packages/agent-runtime/package.json` como amostra representativa.
- `tsconfig.json` estende `@repo/typescript-config/nextjs.json` (ou
  equivalente) — não reverificado em todos os 33 packages nesta rodada
  (não crítico para Fase 0; typecheck agregado já confirma que está
  correto o suficiente para compilar).
- `turbo.json`: `build` depende de `["^build", "test"]` — **qualquer
  package novo que ganhe um script `test` entra automaticamente no gate de
  build**. Isso é relevante para a Fase 3 (`apps/copiloto-runtime`, novo
  app): se ganhar testes, entra no grafo de build normalmente.
- Biome via `ultracite` (`bun run check`/`bun run fix`) — confirmado
  0 erros em 659 arquivos.

## 2. Onde `apps/copiloto-runtime` (Fase 3) entra no Turborepo

Não existe ainda. Ao ser criado, precisa:
- Entrar em `workspaces` do `package.json` raiz — já cobre `apps/*`
  automaticamente (sem mudança necessária no glob).
- Ter `Dockerfile` — **novo tipo de artefato para este monorepo**: nenhum
  outro app tem Dockerfile hoje (todos são Vercel/Expo). O `turbo.json`
  atual não tem task `docker`/`build:docker` — a Fase 3 precisa decidir se
  isso é uma task Turborepo nova ou um processo fora do Turborepo
  (ex.: só `docker build` direto, sem passar por `turbo`).
- Se ganhar testes (`test` script), automaticamente participa de
  `turbo test` e do gate de `build` — nenhuma configuração extra de
  `turbo.json` deveria ser necessária além do já existente
  `"test": {"dependsOn": ["^test"]}`.

## 3. CI (`ci.yml`) — o que a Fase 3 muda

`ci.yml` hoje roda `lint`/`typecheck`/`test`/`token-drift` — todos via
`bun run <script>`, que por sua vez chama `turbo <task>`. Um novo app
`apps/copiloto-runtime` entra automaticamente nesses jobs **se** ele tiver
os scripts `typecheck`/`test` padrão. O que `ci.yml` **não cobre hoje** e a
Fase 3 precisa decidir: build/push da imagem Docker (não existe job para
isso; `INFRASTRUCTURE.md` também não lista um registry de imagens). Isso é
uma lacuna real de CI/CD para a Fase 3 resolver, não desta Fase 0.

## 4. Nenhuma mudança de configuração nesta Fase 0

`turbo.json`, `package.json` raiz e `.github/workflows/ci.yml` não foram
alterados — confirmado por `git status` limpo ao final desta sessão (fora
dos novos arquivos em `docs/executar/`). Este documento é o mapa para
quando a Fase 3 precisar tocar essas configurações.
