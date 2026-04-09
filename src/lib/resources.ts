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

type ParsedFrontmatter = {
  title?: string;
  summary?: string;
  order?: number;
};

type ParsedResourceFile = {
  meta: ParsedFrontmatter;
  content: string;
};

const RESOURCE_ROOT = path.join(process.cwd(), "content", "resources");

function getAudienceDirectory(audience: ResourceAudience) {
  return path.join(RESOURCE_ROOT, audience);
}

function getResourcePath(audience: ResourceAudience, fileName: string) {
  return path.join(getAudienceDirectory(audience), fileName);
}

function slugFromFileName(fileName: string) {
  return fileName.replace(/\.md$/i, "");
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractFirstHeading(markdown: string) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function extractFirstParagraph(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line === "---") continue;
    if (line.startsWith("* ")) continue;
    if (line.startsWith("- ")) continue;
    return line;
  }

  return "";
}

function parseFrontmatter(markdown: string): ParsedResourceFile {
  const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);

  if (!frontmatterMatch) {
    return {
      meta: {},
      content: markdown,
    };
  }

  const rawFrontmatter = frontmatterMatch[1];
  const content = markdown.slice(frontmatterMatch[0].length);

  const meta: ParsedFrontmatter = {};

  for (const rawLine of rawFrontmatter.split("\n")) {
    const line = rawLine.trim();

    if (!line) continue;

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key === "title") {
      meta.title = value;
    } else if (key === "summary") {
      meta.summary = value;
    } else if (key === "order") {
      const parsedOrder = Number(value);

      if (!Number.isNaN(parsedOrder)) {
        meta.order = parsedOrder;
      }
    }
  }

  return {
    meta,
    content,
  };
}

async function loadResourceMetaFromFile(
  audience: ResourceAudience,
  fileName: string
): Promise<ResourceMeta & { order: number }> {
  const filePath = getResourcePath(audience, fileName);
  const rawMarkdown = await fs.readFile(filePath, "utf8");
  const { meta, content } = parseFrontmatter(rawMarkdown);

  const slug = slugFromFileName(fileName);

  const title =
    meta.title?.trim() ||
    extractFirstHeading(content) ||
    titleFromSlug(slug);

  const summary =
    meta.summary?.trim() ||
    extractFirstParagraph(content) ||
    `${title} resource`;

  const order =
    typeof meta.order === "number" ? meta.order : Number.MAX_SAFE_INTEGER;

  return {
    slug,
    title,
    summary,
    audience,
    fileName,
    order,
  };
}

async function loadResourcesByAudience(
  audience: ResourceAudience
): Promise<Array<ResourceMeta & { order: number }>> {
  const directory = getAudienceDirectory(audience);

  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
      encoding: "utf8",
    });

    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);

    const resources = await Promise.all(
      markdownFiles.map((fileName) =>
        loadResourceMetaFromFile(audience, fileName)
      )
    );

    return resources.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.title.localeCompare(b.title);
    });
  } catch {
    return [];
  }
}

export async function getResourcesByAudience(
  audience: ResourceAudience
): Promise<ResourceMeta[]> {
  const resources = await loadResourcesByAudience(audience);

  return resources.map(({ order: _order, ...resource }) => resource);
}

export async function getResourceBySlug(
  audience: ResourceAudience,
  slug: string
): Promise<LoadedResource | null> {
  const resources = await loadResourcesByAudience(audience);
  const resource = resources.find((item) => item.slug === slug);

  if (!resource) {
    return null;
  }

  const rawMarkdown = await fs.readFile(
    getResourcePath(audience, resource.fileName),
    "utf8"
  );

  const { content } = parseFrontmatter(rawMarkdown);
  const { order: _order, ...resourceMeta } = resource;

  return {
    ...resourceMeta,
    markdown: content,
  };
}