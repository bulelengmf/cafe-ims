import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // "pg" memakai modul native Node; jangan di-bundle oleh Next.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
