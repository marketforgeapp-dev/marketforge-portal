import Link from "next/link";
import { getResourcesByAudience } from "@/lib/resources";

export default async function AdminResourcesPage() {
  const [externalResources, internalResources] = await Promise.all([
    getResourcesByAudience("external"),
    getResourcesByAudience("internal"),
  ]);

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
          Resources
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Internal and customer documents
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
          Review internal SOPs and customer-facing resource documents from one place.
        </p>
      </section>

      <section className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/60">
            Internal Resources
          </p>
          <div className="space-y-3">
            {internalResources.map((resource) => (
              <Link
                key={resource.slug}
                href={`/admin/resources/internal/${resource.slug}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]"
              >
                <p className="font-semibold text-white">{resource.title}</p>
                <p className="mt-1 text-sm text-white/70">{resource.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/60">
            Customer Resources
          </p>
          <div className="space-y-3">
            {externalResources.map((resource) => (
              <Link
                key={resource.slug}
                href={`/admin/resources/external/${resource.slug}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]"
              >
                <p className="font-semibold text-white">{resource.title}</p>
                <p className="mt-1 text-sm text-white/70">{resource.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}