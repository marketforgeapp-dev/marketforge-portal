import { notFound } from "next/navigation";
import { getResourceBySlug } from "@/lib/resources";
import { MarkdownDocument } from "@/components/resources/markdown-document";

export default async function AdminInternalResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await getResourceBySlug("internal", slug);

  if (!resource) {
    return notFound();
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-white px-6 py-6 shadow-sm">
      <MarkdownDocument markdown={resource.markdown} />
    </article>
  );
}