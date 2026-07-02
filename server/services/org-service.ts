import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const ACTIVE_ORG_COOKIE = "active_org_id";

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface OrgContext {
  supabase: SupabaseClient;
  user: User;
  organizationId: string;
  organizationName: string;
  /** Todas as organizações a que o utilizador pertence (para o seletor de organização). */
  organizations: OrgMembership[];
}

interface MembershipRow {
  organization_id: string;
  role: string;
  organizations: { name: string } | null;
}

/**
 * Resolve a organização ativa: usa o cookie `active_org_id` se o utilizador
 * ainda pertencer a essa organização; caso contrário cai para a mais antiga
 * (auto-recupera se a organização guardada no cookie deixou de ser válida,
 * por exemplo se o utilizador foi removido dela).
 */
async function resolveMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<{ memberships: OrgMembership[]; activeId: string | null }> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const memberships: OrgMembership[] = ((data ?? []) as unknown as MembershipRow[]).map((m) => ({
    organizationId: m.organization_id,
    organizationName: m.organizations?.name ?? "",
    role: m.role,
  }));

  if (memberships.length === 0) {
    return { memberships, activeId: null };
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const validCookie = cookieOrgId && memberships.some((m) => m.organizationId === cookieOrgId);

  return {
    memberships,
    activeId: validCookie ? cookieOrgId! : memberships[0].organizationId,
  };
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

  const { memberships, activeId } = await resolveMemberships(supabase, user.id);

  if (!activeId) {
    redirect("/onboarding");
  }

  const active = memberships.find((m) => m.organizationId === activeId)!;

  return {
    supabase,
    user,
    organizationId: active.organizationId,
    organizationName: active.organizationName,
    organizations: memberships,
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

  const { memberships, activeId } = await resolveMemberships(supabase, user.id);

  if (!activeId) return null;

  const active = memberships.find((m) => m.organizationId === activeId)!;

  return {
    supabase,
    user,
    organizationId: active.organizationId,
    organizationName: active.organizationName,
    organizations: memberships,
  };
}
