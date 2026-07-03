"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Apenas caminhos internos relativos (evita open redirect)
const RELATIVE_PATH_RE = /^\/[A-Za-z0-9\-_/]*$/;

function safeNext(next: FormDataEntryValue | null): string | null {
  const value = String(next ?? "");
  return value && RELATIVE_PATH_RE.test(value) ? value : null;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email e password obrigatórios"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("Credenciais inválidas"));
  }

  revalidatePath("/", "layout");
  redirect(next ?? "/dashboard");
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || password.length < 8) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Email válido e password com pelo menos 8 caracteres")
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect(next ?? "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
