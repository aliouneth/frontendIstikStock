import Image from "next/image";

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
}: {
  size?: SiteLogoSize;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/logo.png?v=${LOGO_VERSION}`}
      alt="IstikStocks"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={`${SIZES[size]} rounded-xl object-contain ${className}`}
    />
  );
}
