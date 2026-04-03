import Link from "next/link";
import { getResourcesByAudience } from "@/lib/resources";

export default async function ResourcesPage() {
  const resources = await getResourcesByAudience("external");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            MarketForge Resources
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Customer guides and terms
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Reference MarketForge customer-facing guides and legal resources.
          </p>
        </section>

        <section className="space-y-3">
          {resources.map((resource) => (
            <Link
              key={resource.slug}
              href={`/resources/${resource.slug}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300"
            >
              <p className="font-semibold text-gray-900">{resource.title}</p>
              <p className="mt-1 text-sm text-gray-600">{resource.summary}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}