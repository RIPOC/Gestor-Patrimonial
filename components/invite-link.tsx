"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = React.useState(false);
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    setUrl(`${window.location.origin}/invite/${token}`);
  }, [token]);

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url || "…"}</code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
