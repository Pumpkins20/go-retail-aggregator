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
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-zinc-200 bg-white/95 backdrop-blur lg:block">
      <div className="flex h-full flex-col px-5 py-7">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Control Center</p>
          <h1 className="mt-2 font-serif text-xl text-zinc-900">Retail Command Center</h1>
          <p className="mt-1 text-xs text-zinc-600">Stock visibility across all active suppliers.</p>
        </div>

        <nav className="mt-8 flex flex-col gap-1.5" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none ${
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

        <p className="mt-auto text-xs text-zinc-500">Version 3.0</p>
      </div>
    </aside>
  );
}
