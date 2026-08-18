"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  PUBLIC_HEADER_ACTIONS,
  PUBLIC_NAVIGATION,
} from "@/lib/public-site/navigation";

import { PublicLogo } from "./public-logo";

const navigationBaseClassName =
  "relative rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const inactiveNavigationClassName =
  "text-white/65 hover:bg-white/[0.05] hover:text-white";

const activeNavigationClassName =
  "bg-cyan-300/[0.07] text-white after:absolute after:inset-x-3 after:-bottom-[5px] after:h-[2px] after:rounded-full after:bg-cyan-300";

const signInClassName =
  "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const signUpClassName =
  "inline-flex items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.09] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const primaryActionClassName =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.26)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#081018]";

function isActivePath(pathname: string, href: string) {
  if (href === "/knowledge") {
    return pathname === "/knowledge" || pathname.startsWith("/knowledge/");
  }

  return pathname === href;
}

export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#081018]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:min-h-[72px]">
        <PublicLogo />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 xl:flex"
        >
          {PUBLIC_NAVIGATION.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${navigationBaseClassName} ${
                  active
                    ? activeNavigationClassName
                    : inactiveNavigationClassName
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href={PUBLIC_HEADER_ACTIONS.signIn.href}
            className={signInClassName}
          >
            {PUBLIC_HEADER_ACTIONS.signIn.label}
          </Link>

          <Link
            href={PUBLIC_HEADER_ACTIONS.signUp.href}
            className={signUpClassName}
          >
            {PUBLIC_HEADER_ACTIONS.signUp.label}
          </Link>

          <Link
            href={PUBLIC_HEADER_ACTIONS.strategySession.href}
            className={primaryActionClassName}
          >
            {PUBLIC_HEADER_ACTIONS.strategySession.label}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={PUBLIC_HEADER_ACTIONS.strategySession.href}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(59,130,246,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Strategy Session
          </Link>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden">
              Menu
            </summary>

            <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1620] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col"
              >
                {PUBLIC_NAVIGATION.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-xl px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        active
                          ? "bg-cyan-300/[0.09] text-cyan-100"
                          : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="my-2 border-t border-white/10" />

              <div className="grid grid-cols-2 gap-2 p-2">
                <Link
                  href={PUBLIC_HEADER_ACTIONS.signIn.href}
                  className={signInClassName}
                >
                  {PUBLIC_HEADER_ACTIONS.signIn.label}
                </Link>

                <Link
                  href={PUBLIC_HEADER_ACTIONS.signUp.href}
                  className={signUpClassName}
                >
                  {PUBLIC_HEADER_ACTIONS.signUp.label}
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}