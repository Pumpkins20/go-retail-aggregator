"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/suppliers", label: "Supplier Management" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-40 px-4 lg:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-xl border border-zinc-200 bg-white/95 px-4 shadow-sm backdrop-blur-sm">
        <p className="text-sm font-semibold tracking-tight text-zinc-900">Retail Command Center</p>
        <nav className="flex items-center gap-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
