import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOrganizationAutomations } from "@/server/services/automation-service";

/**
 * Job diário (Vercel Cron — ver vercel.json). Corre os automatismos para todas
 * as organizações usando o service role (contorna RLS; uso exclusivo aqui).
 * Protegido por CRON_SECRET — nunca expor este endpoint sem autenticação.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Record<string, unknown> = {};
  for (const org of organizations ?? []) {
    try {
      results[org.id] = await runOrganizationAutomations(supabase, org.id);
    } catch (err) {
      results[org.id] = { error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  }

  return NextResponse.json({ organizations: organizations?.length ?? 0, results });
}
