"use client";

import * as React from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Modal de recolha de credenciais do Portal das Finanças. O formulário
 * submete diretamente para a server action indicada — as credenciais nunca
 * tocam em nenhum estado persistido do browser (sem localStorage, sem
 * contexto React, sem cache) nem em nenhuma tabela da base de dados.
 */
export function ATCredentialsModal({
  action,
  triggerLabel,
  title,
  description,
  hiddenFields,
}: {
  action: (formData: FormData) => Promise<void>;
  triggerLabel: string;
  title: string;
  description: string;
  hiddenFields?: Record<string, string>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-base font-semibold">{title}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">{description}</p>

            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              As credenciais são usadas apenas nesta operação e nunca ficam guardadas.
              Recomendamos usar um subutilizador do Portal das Finanças em vez da conta principal.
            </div>

            <form action={action} className="space-y-4">
              {hiddenFields &&
                Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
              <div className="space-y-1.5">
                <Label htmlFor="at_username">Utilizador (NIF/Subutilizador)</Label>
                <Input id="at_username" name="at_username" placeholder="555555555/0000" required autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="at_password">Senha do Portal das Finanças</Label>
                <Input id="at_password" name="at_password" type="password" required autoComplete="off" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">Confirmar e submeter</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
