import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_STORE_NAME || "E-Commerce Store",
    template: `%s | ${process.env.NEXT_PUBLIC_STORE_NAME || "Store"}`,
  },
  description: "Modern e-commerce with pickup scheduling — browse, order, and pick up at your convenience.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#16a34a",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
