import Link from "next/link";

import {
  PUBLIC_HEADER_ACTIONS,
  PUBLIC_NAVIGATION,
} from "@/lib/public-site/navigation";
import { MARKETFORGE_TERMINOLOGY } from "@/lib/public-site/terminology";

import { PublicLogo } from "./public-logo";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#060c12]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <PublicLogo />

            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
              {MARKETFORGE_TERMINOLOGY.corePromise}
            </p>

            <p className="mt-2 text-sm font-medium text-white/80">
              {MARKETFORGE_TERMINOLOGY.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                Explore
              </div>

              <nav
                aria-label="Footer navigation"
                className="mt-4 flex flex-col gap-3"
              >
                {PUBLIC_NAVIGATION.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-white/65 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                MarketForge
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={PUBLIC_HEADER_ACTIONS.strategySession.href}
                  className="text-sm text-white/65 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {PUBLIC_HEADER_ACTIONS.strategySession.label}
                </Link>

                <Link
                  href={PUBLIC_HEADER_ACTIONS.signUp.href}
                  className="text-sm text-white/65 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {PUBLIC_HEADER_ACTIONS.signUp.label}
                </Link>

                <Link
                  href={PUBLIC_HEADER_ACTIONS.signIn.href}
                  className="text-sm text-white/65 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {PUBLIC_HEADER_ACTIONS.signIn.label}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-5 text-white/40">
          © {year} {MARKETFORGE_TERMINOLOGY.legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}