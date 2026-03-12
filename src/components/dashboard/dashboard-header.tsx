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
    <div className="mf-dark-panel mf-grid-glow rounded-3xl px-6 py-5 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#F5B942]/30 bg-[#F5B942]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F5B942]">
              Live Workspace
            </span>

            <span className="rounded-full border border-[#1ED18A]/30 bg-[#1ED18A]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1ED18A]">
              Revenue Engine Active
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            {workspaceName}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Revenue intelligence, campaign guidance, and managed execution for local
            service businesses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/10">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={workspaceName}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Image
                  src="/MarketForge_Logo.jpeg"
                  alt="MarketForge"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                  priority
                />
              )}
            </div>

            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Platform
              </p>
              <p className="text-xs font-semibold text-white">
                MarketForge v1
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80">
            Notifications
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