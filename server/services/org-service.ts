import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface OrgContext {
  supabase: SupabaseClient;
  user: User;
  organizationId: string;
  organizationName: string;
}

/**
 * Contexto autenticado + organização ativa.
 * Redireciona para /login sem sessão e para /onboarding sem organização.
 * Toda a lógica de dados deve passar por aqui — nunca confiar apenas na UI.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const org = membership.organizations as unknown as { name: string } | null;

  return {
    supabase,
    user,
    organizationId: membership.organization_id,
    organizationName: org?.name ?? "",
  };
}

export interface TenantContext {
  supabase: SupabaseClient;
  user: User;
  tenantId: string;
  tenantName: string;
}

/**
 * Contexto do portal do inquilino. Liga automaticamente o utilizador ao
 * registo de inquilino com o mesmo email (claim_tenant_profile) e devolve-o.
 */
export async function getTenantContextOrNull(): Promise<TenantContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Auto-liga por email (idempotente) e obtém o id do inquilino
  const { data: tenantId } = await supabase.rpc("claim_tenant_profile");
  if (!tenantId) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return null;

  return { supabase, user, tenantId: tenant.id, tenantName: tenant.name };
}

/** Igual a getOrgContext mas devolve null em vez de redirecionar (para layouts). */
export async function getOrgContextOrNull(): Promise<OrgContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const org = membership.organizations as unknown as { name: string } | null;

  return {
    supabase,
    user,
    organizationId: membership.organization_id,
    organizationName: org?.name ?? "",
  };
}
