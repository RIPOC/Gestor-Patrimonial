"use client";

import { Building2 } from "lucide-react";
import { switchOrganization } from "@/server/actions/organizations";
import type { OrgMembership } from "@/server/services/org-service";

export function OrgSwitcher({
  organizations,
  currentOrganizationId,
}: {
  organizations: OrgMembership[];
  currentOrganizationId: string;
}) {
  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="font-medium text-foreground">
          {organizations[0]?.organizationName ?? "Sem organização"}
        </span>
      </div>
    );
  }

  return (
    <form action={switchOrganization} className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <select
        name="organization_id"
        defaultValue={currentOrganizationId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-border bg-card px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Trocar de organização"
      >
        {organizations.map((org) => (
          <option key={org.organizationId} value={org.organizationId}>
            {org.organizationName}
          </option>
        ))}
      </select>
    </form>
  );
}
