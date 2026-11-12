import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and mongodb must run as native Node modules on the server
  serverExternalPackages: ["pdf-parse", "mongodb"],
};

export default nextConfig;

