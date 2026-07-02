import * as React from "react";
import { cn } from "@/lib/utils";

// Lógica visual por estado (secção 8 da especificação):
// verde=pago, amarelo=pendente, vermelho=atraso, cinzento=devoluto,
// azul=recibo por emitir, roxo=ação fiscal pendente
export type BadgeTone =
  | "green"
  | "yellow"
  | "red"
  | "gray"
  | "blue"
  | "purple"
  | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-slate-200 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  neutral: "bg-muted text-muted-foreground",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
