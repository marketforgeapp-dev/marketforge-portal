import {
  absolutePublicUrl,
  PUBLIC_SITE_CONFIG,
} from "./site-config";

export const ORGANIZATION_SCHEMA_ID = absolutePublicUrl(
  "/#organization",
);

export const WEBSITE_SCHEMA_ID = absolutePublicUrl("/#website");

export const FOUNDER_SCHEMA_ID = absolutePublicUrl(
  "/why-marketforge#patrick-donovan",
);

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_SCHEMA_ID,
    name: PUBLIC_SITE_CONFIG.name,
    legalName: PUBLIC_SITE_CONFIG.legalName,
    url: PUBLIC_SITE_CONFIG.url,
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_SCHEMA_ID,
    url: PUBLIC_SITE_CONFIG.url,
    name: PUBLIC_SITE_CONFIG.name,
    publisher: {
      "@id": ORGANIZATION_SCHEMA_ID,
    },
  };
}

type WebPageSchemaInput = {
  name: string;
  description: string;
  path: string;
};

export function buildWebPageSchema({
  name,
  description,
  path,
}: WebPageSchemaInput) {
  const url = absolutePublicUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: {
      "@id": WEBSITE_SCHEMA_ID,
    },
    about: {
      "@id": ORGANIZATION_SCHEMA_ID,
    },
  };
}

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolutePublicUrl(item.path),
    })),
  };
}

export function buildFounderSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_SCHEMA_ID,
    name: PUBLIC_SITE_CONFIG.founder.name,
    jobTitle: PUBLIC_SITE_CONFIG.founder.jobTitle,
    worksFor: {
      "@id": ORGANIZATION_SCHEMA_ID,
    },
    url: absolutePublicUrl("/why-marketforge"),
  };
}