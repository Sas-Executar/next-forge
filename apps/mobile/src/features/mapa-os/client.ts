import { env } from "@/env";

export const PROJECTION_IDS = [
  "mapa_operacional",
  "agora_proximo_depois",
  "status_terminal",
  "prisma_7d",
] as const;
export type ProjectionId = (typeof PROJECTION_IDS)[number];

class ProjectionFetchFailedError extends Error {
  constructor(status: number) {
    super(`/mapa-os failed: HTTP ${status}`);
    this.name = "ProjectionFetchFailedError";
  }
}

/**
 * Fetches one Mapa-OS projection at a time (mirrors apps/api's GET
 * /mapa-os — one query param, one response). `data`'s shape depends on
 * `projection`; the mobile screen narrows it itself per the projection
 * it requested rather than this client module modeling all 4 payload
 * shapes generically.
 */
export const fetchProjection = async (
  projection: ProjectionId,
  options: { readonly authorized?: boolean; readonly projectId?: string },
  sessionToken: string
  // biome-ignore lint/suspicious/noExplicitAny: 4 distinct payload shapes, narrowed by the caller per `projection`
): Promise<any> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const url = new URL("/mapa-os", env.EXPO_PUBLIC_API_URL);
  url.searchParams.set("projection", projection);
  if (options.projectId) {
    url.searchParams.set("projectId", options.projectId);
  }
  if (options.authorized) {
    url.searchParams.set("authorized", "true");
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ProjectionFetchFailedError(response.status);
  }
  const body = await response.json();
  return body.data;
};
