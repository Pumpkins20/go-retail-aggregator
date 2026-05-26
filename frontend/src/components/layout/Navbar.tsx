"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/inventory", label: "Inventory" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-white/80 border-b border-zinc-200 shadow-sm backdrop-blur-sm px-4 flex items-center justify-between lg:hidden">
      {/* Brand Name using Display Serif Font */}
      <Link href="/" className="font-display text-base font-semibold tracking-tight text-zinc-900">
        Retail HQ
      </Link>

      <nav className="flex items-center gap-1" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 ${
                active
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
