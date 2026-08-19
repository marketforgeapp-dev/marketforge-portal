import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/revenue-operating-system",
        destination: "/growth-execution-platform",
        permanent: true,
      },
      {
        source: "/knowledge/what-is-a-revenue-operating-system",
        destination: "/knowledge/what-is-a-growth-execution-platform",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;