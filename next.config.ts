import type { NextConfig } from "next";
import { dashboardHome } from "./src/config/navigation";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  cacheComponents: true,
  partialPrefetching: true,
  redirects() {
    return [{ source: "/", destination: dashboardHome, permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
