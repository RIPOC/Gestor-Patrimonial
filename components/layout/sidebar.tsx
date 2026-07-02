"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserRound,
  FileText,
  Euro,
  CreditCard,
  Receipt,
  Wallet,
  FolderArchive,
  Wrench,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owners", label: "Proprietários", icon: Users },
  { href: "/properties", label: "Imóveis", icon: Building2 },
  { href: "/tenants", label: "Inquilinos", icon: UserRound },
  { href: "/leases", label: "Contratos", icon: FileText },
  { href: "/rents", label: "Rendas", icon: Euro },
  { href: "/payments", label: "Pagamentos", icon: CreditCard },
  { href: "/receipts", label: "Recibos AT", icon: Receipt },
  { href: "/expenses", label: "Despesas", icon: Wallet },
  { href: "/documents", label: "Arquivo Digital", icon: FolderArchive },
  { href: "/maintenance", label: "Ocorrências", icon: Wrench },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold tracking-tight">
          Gestor Patrimonial
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
