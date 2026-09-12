import { env } from "@/env";

export interface MobileProject {
  createdAt: string;
  deliverableCount: number;
  description: string | null;
  id: string;
  name: string;
  taskCount: number;
}

class ProjectsFetchFailedError extends Error {
  constructor(status: number) {
    super(`/projects failed: HTTP ${status}`);
    this.name = "ProjectsFetchFailedError";
  }
}

/** Read-only list — matches apps/api's GET /projects. Creating a project remains web-only for now (M21 scope cut). */
export const fetchProjects = async (
  sessionToken: string
): Promise<readonly MobileProject[]> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(new URL("/projects", env.EXPO_PUBLIC_API_URL), {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ProjectsFetchFailedError(response.status);
  }
  const body = (await response.json()) as { projects: MobileProject[] };
  return body.projects;
};
