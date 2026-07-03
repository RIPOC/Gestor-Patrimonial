import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê os ficheiros de métricas de fonte (.afm) do disco em runtime;
  // pdf-parse (via pdfjs-dist) parte quando o webpack o rebundle na camada
  // "action-browser" das server actions — ambos ficam fora do bundle.
  serverExternalPackages: ["pdfkit", "pdf-parse"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
