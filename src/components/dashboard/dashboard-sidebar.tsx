"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Command Center", href: "/dashboard" },
  { label: "Opportunities", href: "/opportunities" },
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
    <aside className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:w-[260px] lg:self-start">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
          MarketForge
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Command Center
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Revenue guidance and launch workflow for local service businesses.
        </p>
      </div>

      <nav className="mt-6 space-y-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
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