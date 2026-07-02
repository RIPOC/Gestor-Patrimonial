import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">Gestor Patrimonial Online</span>
          </div>
          <CardTitle>Configuração necessária</CardTitle>
          <CardDescription>
            As credenciais do Supabase ainda não estão configuradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Crie um projeto em{" "}
              <span className="font-mono text-primary">supabase.com</span>
            </li>
            <li>
              Execute as migrations em{" "}
              <span className="font-mono">supabase/migrations/</span> (SQL Editor
              ou <span className="font-mono">supabase db push</span>)
            </li>
            <li>
              Copie <span className="font-mono">.env.example</span> para{" "}
              <span className="font-mono">.env.local</span> e preencha{" "}
              <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
              <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            </li>
            <li>Reinicie o servidor de desenvolvimento</li>
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
