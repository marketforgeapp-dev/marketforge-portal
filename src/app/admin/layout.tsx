import { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/is-admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#081018] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 lg:px-8">
        <header className="mb-5 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
                MarketForge Admin
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Operations Console
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Launch actions, review leads, and manage customer execution from one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-2">
                <Link
                  href="/admin/launch-queue"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                >
                  Launch Queue
                </Link>

                <Link
                  href="/admin/leads"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                >
                  Leads
                </Link>
              </nav>

              <div className="rounded-full border border-white/10 bg-white p-1">
                <UserButton />
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-5">{children}</main>
      </div>
    </div>
  );
}