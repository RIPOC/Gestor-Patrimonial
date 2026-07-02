import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gestor Patrimonial Online",
    template: "%s · Gestor Patrimonial",
  },
  description:
    "Plataforma online de gestão de arrendamentos em Portugal — imóveis, contratos, rendas, recibos, despesas e arquivo digital.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
