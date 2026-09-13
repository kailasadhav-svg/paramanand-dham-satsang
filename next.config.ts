import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  async redirects() {
    return [
      { source: "/a", destination: "/attendance", permanent: false },
      { source: "/t", destination: "/topic", permanent: false },
      { source: "/q", destination: "/questions", permanent: false },
      { source: "/j", destination: "/ajapa", permanent: false },
      { source: "/r", destination: "/report", permanent: false },
    ];
  },
};

export default nextConfig;
