import { promises as fs } from "fs";
import path from "path";

export type ResourceAudience = "external" | "internal";

export type ResourceMeta = {
  slug: string;
  title: string;
  summary: string;
  audience: ResourceAudience;
  fileName: string;
};

export type LoadedResource = ResourceMeta & {
  markdown: string;
};

const RESOURCES: ResourceMeta[] = [
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    summary: "Terms governing customer use of MarketForge.",
    audience: "external",
    fileName: "terms-and-conditions.md",
  },
  {
    slug: "lead-capture-guide",
    title: "Lead Capture Guide",
    summary: "How customers should report booked jobs and lead outcomes to MarketForge.",
    audience: "external",
    fileName: "lead-capture-guide.md",
  },
  {
    slug: "action-execution-guide",
    title: "Action Execution Guide",
    summary: "How customers should understand action launch stages and execution expectations.",
    audience: "external",
    fileName: "action-execution-guide.md",
  },
  {
    slug: "internal-execution-guide",
    title: "Internal Execution Guide",
    summary: "Founder-led MarketForge internal execution SOP for campaigns and actions.",
    audience: "internal",
    fileName: "internal-execution-guide.md",
  },
  {
    slug: "internal-lead-capture-sop",
    title: "Internal Lead Capture SOP",
    summary: "Internal procedure for entering, attributing, and reporting booked jobs.",
    audience: "internal",
    fileName: "internal-lead-capture-sop.md",
  },
];

function getResourcePath(resource: ResourceMeta) {
  return path.join(
    process.cwd(),
    "content",
    "resources",
    resource.audience,
    resource.fileName
  );
}

export async function getResourcesByAudience(audience: ResourceAudience) {
  return RESOURCES.filter((resource) => resource.audience === audience);
}

export async function getResourceBySlug(
  audience: ResourceAudience,
  slug: string
): Promise<LoadedResource | null> {
  const resource = RESOURCES.find(
    (item) => item.audience === audience && item.slug === slug
  );

  if (!resource) {
    return null;
  }

  const markdown = await fs.readFile(getResourcePath(resource), "utf8");

  return {
    ...resource,
    markdown,
  };
}