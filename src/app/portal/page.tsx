import { redirect } from "next/navigation";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";

export default async function PortalHome() {
  const { userId } = await auth();

  if (userId) {
    const workspace = await getCurrentWorkspace();

    if (!workspace || !workspace.onboardingCompletedAt) {
      redirect("/portal/onboarding");
    }

    redirect("/portal/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-100 px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">MarketForge</h1>

          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <SignInButton mode="redirect" forceRedirectUrl="/portal">
                <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="redirect" forceRedirectUrl="/portal">
                <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Revenue Intelligence for Local Service Businesses
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">
            Turn demand signals into booked jobs.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
            MarketForge helps local service businesses identify revenue
            opportunities, generate campaigns, launch execution workflows, track
            leads, and attribute revenue back to performance.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <SignUpButton mode="redirect" forceRedirectUrl="/portal">
              <button className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
                Create Account
              </button>
            </SignUpButton>

            <SignInButton mode="redirect" forceRedirectUrl="/portal">
              <button className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">
                Sign In
              </button>
            </SignInButton>
          </div>
        </section>
      </div>
    </main>
  );
}