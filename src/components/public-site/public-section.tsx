import type { ReactNode } from "react";

type PublicSectionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  labelledBy?: string;
};

export function PublicSection({
  children,
  className = "",
  contentClassName = "",
  id,
  labelledBy,
}: PublicSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`relative px-4 py-16 sm:px-6 sm:py-20 lg:py-24 ${className}`}
    >
      <div
        className={`mx-auto w-full max-w-7xl ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  );
}