import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — contorna RLS. Uso exclusivo em rotas de servidor
 * de confiança (cron/automatismos), NUNCA no browser nem em código exposto ao utilizador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
