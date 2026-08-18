import type { ReactNode } from "react";

import { PublicEntitySchema } from "./public-entity-schema";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

type PublicSiteShellProps = {
  children: ReactNode;
};

export function PublicSiteShell({
  children,
}: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#081018] text-white">
      <PublicEntitySchema />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_26%),linear-gradient(180deg,#081018_0%,#09131d_52%,#060c12_100%)]"
      />

      <PublicHeader />

      <main>{children}</main>

      <PublicFooter />
    </div>
  );
}