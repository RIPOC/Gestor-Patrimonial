"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão de eliminação com confirmação nativa do browser antes de submeter.
 * A ação do servidor é responsável por bloquear com mensagem clara quando
 * existem registos associados (chaves estrangeiras) que impedem a eliminação.
 */
export function DeleteButton({
  action,
  confirmMessage,
  label = "Eliminar",
  size = "default",
}: {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  label?: string;
  size?: "default" | "sm" | "lg";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" size={size}>
        <Trash2 className="h-4 w-4" /> {label}
      </Button>
    </form>
  );
}
