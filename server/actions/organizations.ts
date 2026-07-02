"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { organizationSchema } from "@/lib/validators";
import { ACTIVE_ORG_COOKIE } from "@/server/services/org-service";

const ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

async function setActiveOrgCookie(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ORG_COOKIE_MAX_AGE,
  });
}

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number"),
  });

  if (!parsed.success) {
    redirect(
      "/onboarding?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  // O trigger handle_new_organization adiciona o criador como org_admin
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.name,
      tax_number: parsed.data.tax_number,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/onboarding?error=" + encodeURIComponent(error.message));
  }

  await supabase
    .from("profiles")
    .update({ default_organization_id: org.id })
    .eq("id", user.id);

  await setActiveOrgCookie(org.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Cria uma organização adicional a partir de uma conta já com sessão iniciada. */
export async function createAdditionalOrganization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number"),
  });

  if (!parsed.success) {
    redirect(
      "/settings/organizations/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  // O trigger handle_new_organization adiciona o criador como org_admin
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.name,
      tax_number: parsed.data.tax_number,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/settings/organizations/new?error=" + encodeURIComponent(error.message));
  }

  await setActiveOrgCookie(org.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Troca a organização ativa — verifica sempre que o utilizador pertence mesmo a ela. */
export async function switchOrganization(formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!organizationId) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard?error=" + encodeURIComponent("Não pertence a essa organização"));
  }

  await setActiveOrgCookie(organizationId);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
