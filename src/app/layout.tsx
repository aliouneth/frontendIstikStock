import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "IstikStocks — Penny Stock Intelligence",
  description:
    "Daily top-5 penny stock recommendations learned from historical pattern learning — not financial advice. Penny stocks are highly volatile and illiquid.",
  icons: {
    icon: "/logo.png?v=2026-09-29a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
