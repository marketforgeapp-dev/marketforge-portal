import type { Metadata } from "next";

import {
  absolutePublicUrl,
  PUBLIC_SITE_CONFIG,
} from "./site-config";

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function buildPublicMetadata({
  title,
  description,
  path,
  type = "website",
  noIndex = false,
}: PublicMetadataInput): Metadata {
  const canonicalUrl = absolutePublicUrl(path);

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },

    openGraph: {
      type,
      title,
      description,
      url: canonicalUrl,
      siteName: PUBLIC_SITE_CONFIG.name,
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}