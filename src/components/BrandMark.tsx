import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  subtitle?: string;
};

export default function BrandMark({
  href,
  compact = false,
  subtitle = "A51 Barber Shop",
}: BrandMarkProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-transparent">
        <Image
          src="/a51barbershop.jpeg"
          alt="A51 Barber Shop"
          width={compact ? 44 : 52}
          height={compact ? 44 : 52}
          className="h-11 w-11 object-contain sm:h-[52px] sm:w-[52px] invert"
          priority
        />
      </div>
      {subtitle && subtitle !== "A51 Barber Shop" && (
        <div>
          <p className="font-display text-lg font-semibold text-white sm:text-xl">{subtitle}</p>
        </div>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
