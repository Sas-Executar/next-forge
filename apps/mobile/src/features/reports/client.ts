import { env } from "@/env";

export interface MobileReport {
  generatedAt: string;
  id: string;
  progress: { project_percent: number; today_delta: number };
  properties: {
    problem: string;
    risk: string;
    next_1: string | null;
    next_2: string | null;
    next_3: string | null;
  };
  status: "OK" | "CONDICIONAL" | "BLOQUEADO" | "ERRO";
}

class ReportsFetchFailedError extends Error {
  constructor(status: number) {
    super(`/reports failed: HTTP ${status}`);
    this.name = "ReportsFetchFailedError";
  }
}

export const fetchReports = async (
  sessionToken: string
): Promise<readonly MobileReport[]> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(new URL("/reports", env.EXPO_PUBLIC_API_URL), {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ReportsFetchFailedError(response.status);
  }
  const body = (await response.json()) as { reports: MobileReport[] };
  return body.reports;
};

class GenerateReportFailedError extends Error {
  constructor(status: number) {
    super(`/reports/generate failed: HTTP ${status}`);
    this.name = "GenerateReportFailedError";
  }
}

export const generateReport = async (
  sessionToken: string,
  projectId?: string
): Promise<void> => {
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }
  const response = await fetch(
    new URL("/reports/generate", env.EXPO_PUBLIC_API_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ projectId }),
    }
  );
  if (!response.ok) {
    throw new GenerateReportFailedError(response.status);
  }
};
