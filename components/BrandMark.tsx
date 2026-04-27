import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  light?: boolean;
  className?: string;
};

export default function BrandMark({
  href = "/",
  compact = false,
  light = false,
  className = "",
}: BrandMarkProps) {
  const wordmarkClass = light ? "text-white" : "text-[var(--foreground)]";

  const content = (
    <span className={`brand-lockup ${className}`.trim()}>
      <span className="brand-mark" aria-hidden="true">
        WR
      </span>
      {!compact ? (
        <span className={`brand-wordmark text-2xl ${wordmarkClass}`}>
          Wint<span className="brand-wordmark-accent">Rides</span>
        </span>
      ) : null}
    </span>
  );

  return (
    <Link href={href} aria-label="WintRides home">
      {content}
    </Link>
  );
}
