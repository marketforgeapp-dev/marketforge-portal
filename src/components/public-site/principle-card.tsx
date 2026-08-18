import type { ReactNode } from "react";

type PrincipleCardProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
};

export function PrincipleCard({
  eyebrow,
  title,
  children,
}: PrincipleCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/75">
          {eyebrow}
        </div>
      )}

      <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
        {title}
      </h3>

      <div className="mt-3 text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
        {children}
      </div>
    </div>
  );
}