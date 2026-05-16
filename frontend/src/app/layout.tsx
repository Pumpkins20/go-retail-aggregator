import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./global.css"; // Pastikan path ini mengarah ke file CSS Tailwind-mu

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Retail Command Center",
  description: "Real-time stock aggregator dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}