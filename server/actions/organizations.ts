"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { organizationSchema } from "@/lib/validators";

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

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
