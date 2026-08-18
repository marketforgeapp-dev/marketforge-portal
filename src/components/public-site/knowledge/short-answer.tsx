import type { ReactNode } from "react";

type ShortAnswerProps = {
  children: ReactNode;
};

export function ShortAnswer({ children }: ShortAnswerProps) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
        Short answer
      </div>

      <div className="mt-3 text-base leading-7 text-white/88 sm:text-lg sm:leading-8">
        {children}
      </div>
    </div>
  );
}