import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Batch CV uploads (20 × 5MB PDFs) exceed the 1MB Server Action
  // default. Increase the body cap so the ingest route accepts them.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // unpdf + mammoth are Node-only and ship binary/wasm assets. Keep
  // them out of the bundler so Vercel's Node runtime resolves them.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
