import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message?: string | string[] }) {
  if (!message) return null;
  const text = Array.isArray(message) ? message[0] : message;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
