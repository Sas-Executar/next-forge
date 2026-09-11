import { withToolbar } from "@repo/feature-flags/lib/toolbar";
import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";

/**
 * Fase 6 (C15, plano §7) — mapa `anterior → novo` de rotas em inglês
 * para pt-BR. `/copilot` → `/copiloto` é o primeiro renomeado nesta
 * fase (código real, com redirect testável); os demais (`/now`,
 * `/reports`, `/projects`, `/automations`, `/workflows`,
 * `/integrations`) ficam documentados em
 * docs/executar/PLANO_IMPLEMENTACAO_INCREMENTAL.md's Fase 6 entry como
 * trabalho remanescente — renomear todos de uma vez nesta sessão
 * arriscaria quebrar navegação/testes sem tempo de verificar cada um.
 */
const appConfig: NextConfig = {
  ...config,
  redirects: async () => [
    ...((await config.redirects?.()) ?? []),
    { source: "/copilot", destination: "/copiloto", permanent: false },
  ],
};

let nextConfig: NextConfig = withToolbar(withLogging(appConfig));

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
