import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={<Construction className="h-10 w-10" />}
        title="Módulo em desenvolvimento"
        description={`Este módulo está planeado para a ${phase} do roadmap. A estrutura da base de dados já está preparada.`}
      />
    </div>
  );
}
