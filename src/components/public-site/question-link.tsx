import Link from "next/link";

type QuestionLinkProps = {
  href: string;
  children: string;
  className?: string;
};

export function QuestionLink({
  href,
  children,
  className = "",
}: QuestionLinkProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-start gap-2 text-sm font-semibold leading-6 text-cyan-300 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${className}`}
    >
      <span>{children}</span>

      <span
        aria-hidden="true"
        className="mt-px transition-transform group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}