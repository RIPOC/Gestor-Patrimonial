import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê os ficheiros de métricas de fonte (.afm) do disco em runtime;
  // mantê-lo fora do bundle webpack evita que esses ficheiros fiquem em falta.
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
