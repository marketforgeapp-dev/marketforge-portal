"use client";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#081018] px-6 py-16 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/portal/dashboard"
          fallbackRedirectUrl="/portal/dashboard"
        />
      </div>
    </main>
  );
}