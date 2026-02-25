import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
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
        <Providers>
          <NavBar />
          <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
