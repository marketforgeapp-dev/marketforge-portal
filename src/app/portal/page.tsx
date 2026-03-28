import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";

async function isAdminUser() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

  if (!email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email);
}

export default async function PortalHome() {
  const { userId } = await auth();

  if (userId) {
    if (await isAdminUser()) {
      redirect("/portal//admin");
    }

    const workspace = await getCurrentWorkspace();

    if (!workspace || !workspace.onboardingCompletedAt) {
      redirect("/portal/onboarding");
    }

    redirect("/portal/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#081018] px-8 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">MarketForge</h1>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-medium text-white/80 hover:bg-white/10"
            >
              Sign In
            </Link>

            <Link
              href="/sign-up"
              className="rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-4 py-2 font-medium text-white hover:from-blue-500 hover:to-indigo-500"
            >
              Get Started
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Revenue Opportunity System
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white">
            Turn demand into booked jobs.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
            MarketForge helps home service businesses identify revenue
            opportunities, generate launch-ready actions, guide execution, track
            leads, and tie work directly to booked revenue.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className="rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-5 py-3 font-medium text-white hover:from-blue-500 hover:to-indigo-500"
            >
              Get Started
            </Link>

            <Link
              href="/sign-in"
              className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 font-medium text-white/80 hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}