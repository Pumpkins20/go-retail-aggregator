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
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-xl border border-border bg-card px-4 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-foreground">Retail Command Center</p>
        <nav className="flex items-center gap-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
