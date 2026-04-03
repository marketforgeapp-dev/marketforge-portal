import { notFound } from "next/navigation";
import { getResourceBySlug } from "@/lib/resources";
import { MarkdownDocument } from "@/components/resources/markdown-document";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await getResourceBySlug("external", slug);

  if (!resource) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-4xl">
        <article className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <MarkdownDocument markdown={resource.markdown} />
        </article>
      </div>
    </main>
  );
}