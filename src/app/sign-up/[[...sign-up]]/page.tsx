import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#081018] px-6 py-16 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <SignUp />
      </div>
    </main>
  );
}