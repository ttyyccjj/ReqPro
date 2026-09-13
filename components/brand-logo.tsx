import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  href = "/",
  onDark = true,
}: {
  href?: string;
  onDark?: boolean;
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5">
      <Image
        src="/reqpro-mark.png"
        alt=""
        width={90}
        height={92}
        className="h-11 w-11 shrink-0 object-contain"
        priority
      />
      <span className="min-w-0 leading-none">
        <span
          className={`block text-[1.375rem] font-bold tracking-tight ${
            onDark ? "text-white" : "text-ink"
          }`}
        >
          Req<span className="text-brand">Pro</span>
        </span>
        <span className="mt-1 block text-[12px] font-medium tracking-[0.01em] text-teal">
          Request & Approve
        </span>
      </span>
    </Link>
  );
}
