import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiny Steps — ADHD Task Decomposer",
  description:
    "Break any overwhelming task into absurdly small micro-steps. One step at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <nav aria-label="Main navigation" className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-stone-800">
              tiny steps
            </Link>
            <Link
              href="/history"
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              History
            </Link>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
