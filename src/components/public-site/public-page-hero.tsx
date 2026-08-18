import type { ReactNode } from "react";

import { PublicEyebrow } from "./public-eyebrow";
import { PublicSection } from "./public-section";

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
};

export function PublicPageHero({
  eyebrow,
  title,
  description,
  children,
}: PublicPageHeroProps) {
  return (
    <PublicSection contentClassName="max-w-5xl">
      <PublicEyebrow>{eyebrow}</PublicEyebrow>

      <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      <div className="mt-6 max-w-3xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
        {description}
      </div>

      {children && <div className="mt-8">{children}</div>}
    </PublicSection>
  );
}