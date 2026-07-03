import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CadernetaImportForm } from "@/components/caderneta-import-form";

export const metadata = { title: "Importar caderneta predial" };

export default function ImportCadernetaPage() {
  return (
    <div>
      <PageHeader
        title="Importar caderneta predial"
        description="Carregue o PDF da caderneta predial (urbana ou rústica) para extrair automaticamente os dados do imóvel e dos titulares."
      >
        <Link href="/properties">
          <Button variant="outline">← Imóveis</Button>
        </Link>
      </PageHeader>

      <CadernetaImportForm />
    </div>
  );
}
