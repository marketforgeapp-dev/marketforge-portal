import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MarketForge</h1>

        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Marketing Command Center</h2>
        <p>If you can see this page, your Next.js app is running.</p>

        <Show when="signed-out">
          <p>You are signed out.</p>
        </Show>

        <Show when="signed-in">
          <p>You are signed in.</p>
        </Show>
      </section>
    </main>
  );
}