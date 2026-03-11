"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Command Center", href: "/dashboard" },
  { label: "More Revenue Opportunities", href: "/opportunities" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Execution", href: "/execution" },
  { label: "Leads", href: "/leads" },
  { label: "Competitors", href: "/competitors" },
  { label: "Reports", href: "/reports" },
  { label: "AEO", href: "/aeo" },
  { label: "Settings", href: "/settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="mf-glass-panel w-full rounded-3xl p-5 text-white lg:w-[285px] lg:self-start">
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm">
            <Image
              src="/MarketForge_Logo.jpeg"
              alt="MarketForge"
              width={100}
              height={100}
              className="h-18 w-18 rounded-xl object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F5B942]">
              MarketForge
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Command Center
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/70">
          AI revenue intelligence and managed execution for local service businesses.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          Focus
        </p>
        <p className="mt-2 text-sm font-medium text-white">
          Find revenue competitors are missing and act on it fast.
        </p>
      </div>

      <nav className="mt-5 space-y-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                ? "bg-gradient-to-r from-[#F5B942] via-[#EFCB72] to-[#1ED18A] text-[#0F1115] shadow-[0_10px_24px_rgba(15,17,21,0.28)]"
                  : "border border-white/6 bg-white/5 text-white/80 hover:border-white/12 hover:bg-white/8 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}