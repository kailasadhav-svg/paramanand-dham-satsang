import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  // Ensure literature markdown is available on Vercel serverless
  outputFileTracingIncludes: {
    "/api/ajapa/questions": ["./data/literature/**/*"],
    "/api/ajapa/questions/[id]/regenerate": ["./data/literature/**/*"],
    "/api/whatsapp/webhook": ["./data/literature/**/*"],
  },
  async redirects() {
    return [
      { source: "/a", destination: "/attendance", permanent: false },
      // Exact /t only — /t/guru|/t/software|/t/charansevak stay as test entry pages.
      { source: "/t", destination: "/topic", permanent: false },
      { source: "/q", destination: "/questions", permanent: false },
      { source: "/j", destination: "/ajapa", permanent: false },
      { source: "/r", destination: "/report", permanent: false },
      { source: "/reg", destination: "/register", permanent: false },
      { source: "/ajpa", destination: "/register", permanent: false },
      { source: "/m", destination: "/me", permanent: false },
    ];
  },
};

export default nextConfig;
