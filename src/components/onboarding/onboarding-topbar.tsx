"use client";

import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

export function OnboardingTopbar() {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <Image
              src="/MarketForge_Logo.jpeg"
              alt="MarketForge"
              width={56}
              height={56}
              className="h-10 w-10 rounded-xl object-contain"
              priority
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              MarketForge
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              Account Setup
            </h2>
            <p className="text-sm text-gray-600">
              Complete onboarding to activate your workspace.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs font-medium text-gray-700">Account</span>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-8 w-8",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}