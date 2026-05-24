import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

import "./global.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Retail Command Center",
  description: "Real-time stock aggregator dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${playfair.variable} font-sans text-zinc-900 antialiased`}>
        <div className="relative min-h-screen bg-zinc-50">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-50 via-zinc-50 to-zinc-50"
          />

          <div className="relative min-h-screen lg:flex">
            <Sidebar />
            <div className="flex min-h-screen flex-1 flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </div>

        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
