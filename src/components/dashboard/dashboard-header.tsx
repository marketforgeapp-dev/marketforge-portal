import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

type DashboardHeaderProps = {
  workspaceName: string;
  logoUrl?: string | null;
};

export function DashboardHeader({
  workspaceName,
  logoUrl,
}: DashboardHeaderProps) {
  return (
    <div className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-4 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#1ED18A]/30 bg-[#1ED18A]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1ED18A]">
              Revenue Engine Active
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
            {workspaceName}
          </h1>

          <p className="mt-1.5 text-sm text-white/70">
            Top revenue action, execution readiness, and tracked value.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={workspaceName}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <Image
                  src="/MarketForge_Logo.jpeg"
                  alt={workspaceName}
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain"
                  priority
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs font-medium text-white/80">Account</span>
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
    </div>
  );
}