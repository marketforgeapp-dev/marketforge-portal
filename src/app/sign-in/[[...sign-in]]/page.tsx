import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#081018] px-6 py-16 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <SignIn />
      </div>
    </main>
  );
}