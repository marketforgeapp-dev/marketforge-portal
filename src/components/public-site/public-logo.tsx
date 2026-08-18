import Image from "next/image";
import Link from "next/link";

type PublicLogoProps = {
  compact?: boolean;
};

export function PublicLogo({ compact = false }: PublicLogoProps) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#081018]"
      aria-label="MarketForge home"
    >
      <Image
        src="/MarketForge_Logo.jpeg"
        alt=""
        width={48}
        height={48}
        className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10 sm:h-11 sm:w-11"
        priority
      />

      {!compact && (
        <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
          MarketForge
        </span>
      )}
    </Link>
  );
}