"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/suppliers", label: "Supplier Management" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/70 backdrop-blur lg:block">
      <div className="flex h-full flex-col px-6 py-8">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">Control Center</p>
          <h1 className="mt-3 font-serif text-xl text-foreground">Retail Command Center</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Stock visibility across all active suppliers.
          </p>
        </div>

        <nav className="mt-8 flex flex-col gap-2" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="mt-auto text-xs text-muted-foreground">Version 3.0</p>
      </div>
    </aside>
  );
}
