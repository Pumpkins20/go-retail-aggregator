import type { Metadata } from "next";
import { Nunito_Sans, Rubik } from "next/font/google";
import { Toaster } from "sonner";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

import "./global.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Retail Command Center",
  description: "Real-time stock aggregator dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunitoSans.variable} ${rubik.variable} font-sans antialiased`}>
        <div className="relative min-h-screen">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-amber-100/60 via-transparent to-transparent"
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
