import type { SupabaseClient } from "@supabase/supabase-js";

/** Envia uma notificação in-app a todos os administradores/gestores da organização. */
export async function notifyOrgManagers(
  supabase: SupabaseClient,
  organizationId: string,
  params: { title: string; body?: string; link?: string }
) {
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["org_admin", "owner", "manager"]);

  const recipients = members ?? [];
  if (recipients.length === 0) return;

  await supabase.from("notifications").insert(
    recipients.map((m) => ({
      organization_id: organizationId,
      user_id: m.user_id,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    }))
  );
}
