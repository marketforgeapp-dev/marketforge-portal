import type { ReactNode } from "react";

type PublicEyebrowProps = {
  children: ReactNode;
};

export function PublicEyebrow({
  children,
}: PublicEyebrowProps) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/90 sm:text-sm">
      {children}
    </div>
  );
}