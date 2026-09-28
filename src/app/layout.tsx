import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IstikStocks — Penny Stock Intelligence",
  description:
    "Daily top-5 penny stock recommendations learned from historical runners and macro regimes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
