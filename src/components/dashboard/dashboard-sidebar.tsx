"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Competitors", href: "/competitors" },
  { label: "Reports", href: "/reports" },
  { label: "AEO", href: "/aeo" },
  { label: "Settings", href: "/settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:w-64">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          MarketForge
        </p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">Command Center</h2>
      </div>

      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
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