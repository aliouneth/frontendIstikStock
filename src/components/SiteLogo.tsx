import Image from "next/image";
import Link from "next/link";

/**
 * Intrinsic size of public/logo.png. MUST match the real file, otherwise
 * next/image reserves the wrong box and the layout shifts. Re-measure with:
 *   Add-Type -AssemblyName System.Drawing
 *   $i = [System.Drawing.Image]::FromFile("public\logo.png"); "$($i.Width)x$($i.Height)"
 * Bump LOGO_VERSION whenever the artwork is replaced so browsers and the
 * image optimiser pick up the new file instead of a cached copy.
 */
const LOGO_WIDTH = 1007;
const LOGO_HEIGHT = 416;
const LOGO_VERSION = "2026-09-29a";

const SIZES = {
  sm: "h-12 w-auto",
  md: "h-14 w-auto",
  lg: "h-20 w-auto",
} as const;

export type SiteLogoSize = keyof typeof SIZES;

export default function SiteLogo({
  size = "lg",
  priority = false,
  className = "",
  href = "/",
}: {
  size?: SiteLogoSize;
  priority?: boolean;
  className?: string;
  /**
   * Every page renders the logo inside its header or hero, so it links home by
   * default rather than each call site wrapping it (which would nest anchors).
   * Pass null for a decorative logo that must not be a link.
   */
  href?: string | null;
}) {
  const logo = (
    <Image
      src={`/logo.png?v=${LOGO_VERSION}`}
      alt="IstikStocks"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={`${SIZES[size]} rounded-xl object-contain ${className}`}
    />
  );

  if (!href) {
    return logo;
  }

  return (
    <Link
      href={href}
      aria-label="IstikStocks — back to main page"
      className="inline-block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
    >
      {logo}
    </Link>
  );
}
