import Link from "next/link";

type PaymentsSupportMessageProps = {
  message: string;
  className?: string;
};

const PAYMENTS_LABEL = "Account > Payments";

export default function PaymentsSupportMessage({
  message,
  className,
}: PaymentsSupportMessageProps) {
  // Only rewrite the specific support text we return from payment-readiness
  // errors so every affected screen can render the same inline destination link.
  if (!message.includes(PAYMENTS_LABEL)) {
    return <p className={className}>{message}</p>;
  }

  const [before, after] = message.split(PAYMENTS_LABEL);

  return (
    <p className={className}>
      {before}
      <Link
        href="/account/payments"
        className="font-semibold text-[#2f6db3] underline underline-offset-2 hover:text-[#25588f]"
      >
        {PAYMENTS_LABEL}
      </Link>
      {after}
    </p>
  );
}
