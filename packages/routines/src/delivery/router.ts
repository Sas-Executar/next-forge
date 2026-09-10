import type { StatusReport } from "@repo/reports";
import type { RoutineConfig } from "../types";
import { deliverAppReport } from "./app-reports";
import { sendEmailDelivery } from "./email";
import { sendWhatsAppDelivery } from "./whatsapp";

export interface DeliveryResult {
  readonly channel: string;
  readonly error: string | null;
  readonly status: "sent" | "failed";
}

/**
 * DeliveryRouter (§1, §8). app_reports always runs first and
 * independently of the other channels — §12's required test case
 * ("falha de email com app report preservado" / "falha de WhatsApp com
 * app report preservado") means a channel failing after this point must
 * never roll back or skip the already-persisted report.
 */
export const routeDelivery = async (
  workspaceId: string,
  routineRunId: string,
  report: StatusReport,
  channels: RoutineConfig["delivery"]
): Promise<DeliveryResult[]> => {
  const results: DeliveryResult[] = [];

  const appReportsChannel = channels.find(
    (c) => c.channel === "app_reports" && c.enabled
  );
  if (appReportsChannel) {
    const result = await deliverAppReport(workspaceId, routineRunId, report);
    results.push({
      channel: "app_reports",
      status: result.status,
      error: null,
    });
  }

  const emailChannel = channels.find((c) => c.channel === "email" && c.enabled);
  if (emailChannel) {
    if (emailChannel.recipient_ref) {
      const result = await sendEmailDelivery({
        to_ref: emailChannel.recipient_ref,
        subject: `Status report — ${report.properties.context}`,
        html: `<p>${report.properties.progress}</p><p>${report.properties.next_1 ?? ""}</p>`,
        text: `${report.properties.progress}\n${report.properties.next_1 ?? ""}`,
      });
      results.push({
        channel: "email",
        status: result.status,
        error: result.error,
      });
    } else {
      results.push({
        channel: "email",
        status: "failed",
        error: "missing recipient_ref",
      });
    }
  }

  const whatsappChannel = channels.find(
    (c) => c.channel === "whatsapp" && c.enabled
  );
  if (whatsappChannel) {
    if (whatsappChannel.recipient_ref) {
      const result = await sendWhatsAppDelivery({
        workspaceId,
        recipient_ref: whatsappChannel.recipient_ref,
        text: report.properties.progress,
        report_url: "/reports",
      });
      results.push({
        channel: "whatsapp",
        status: result.status,
        error: result.error,
      });
    } else {
      results.push({
        channel: "whatsapp",
        status: "failed",
        error: "missing recipient_ref",
      });
    }
  }

  return results;
};
