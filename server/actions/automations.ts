"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { runOrganizationAutomations } from "@/server/services/automation-service";

/** Executa os automatismos para a organização atual, sem esperar pelo cron diário. */
export async function runAutomationsNow() {
  const { supabase, organizationId } = await getOrgContext();

  const summary = await runOrganizationAutomations(supabase, organizationId);

  revalidatePath("/dashboard");
  revalidatePath("/rents");
  revalidatePath("/settings");

  const message =
    `${summary.rentsGenerated} renda(s) geradas · ` +
    `${summary.rentsFlippedToOverdue} marcada(s) em atraso · ` +
    `${Object.values(summary.reminders).reduce((s, r) => s + r.created, 0)} novo(s) alerta(s)`;

  redirect("/settings?automation=" + encodeURIComponent(message));
}

export async function resolveReminder(id: string) {
  const { supabase, organizationId } = await getOrgContext();

  await supabase
    .from("reminders")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/dashboard");
}

export async function markNotificationRead(id: string) {
  const { supabase } = await getOrgContext();

  await supabase.from("notifications").update({ is_read: true }).eq("id", id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await getOrgContext();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/notifications");
}
