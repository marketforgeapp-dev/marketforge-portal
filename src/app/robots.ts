import type { MetadataRoute } from "next";

import { PUBLIC_SITE_CONFIG } from "@/lib/public-site/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/aeo/",
        "/campaigns/",
        "/competitors/",
        "/dashboard/",
        "/execution/",
        "/leads/",
        "/onboarding/",
        "/opportunities/",
        "/portal/",
        "/reports/",
        "/settings/",
        "/sign-in/",
        "/sign-up/",
      ],
    },

    sitemap: `${PUBLIC_SITE_CONFIG.url}/sitemap.xml`,
    host: PUBLIC_SITE_CONFIG.url,
  };
}