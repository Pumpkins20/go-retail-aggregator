"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/suppliers", label: "Suppliers", icon: SuppliersIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="10" width="7" height="11" rx="1" />
      <rect x="3" y="12" width="7" height="9" rx="1" />
    </svg>
  );
}

function SuppliersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M9 17h6" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7h18" />
      <path d="M6 7V4h12v3" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M10 12h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-3 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-3 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 3 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.26.3.46.65.6 1a1.7 1.7 0 0 1 0 3 1.7 1.7 0 0 0-.6 1Z" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen md:flex flex-col shrink-0 border-r border-zinc-200 bg-white text-zinc-900 md:w-14 lg:w-[220px]">
      {/* Brand logo header */}
      <div className="h-14 flex items-center border-b border-zinc-100 px-3 lg:px-5 justify-center lg:justify-start">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo mark for tablet, full text for desktop */}
          <span className="lg:hidden font-display text-xl font-bold tracking-tight text-zinc-900">
            R.
          </span>
          <h1 className="hidden lg:block font-display text-[20px] font-semibold tracking-tight text-zinc-900">
            Retail Aggregator
          </h1>
        </Link>
      </div>

      {/* Main navigation list */}
      <div className="flex-1 flex flex-col px-2.5 py-4 overflow-y-auto">
        {/* App stats connectivity in desktop view */}
        <div className="hidden lg:flex flex-col px-2 py-1.5 mb-6 rounded-lg bg-zinc-50 border border-zinc-100">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
            <span>VERSION</span>
            <span>API STATUS</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-600">v1.0</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              ONLINE
            </span>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 h-9 rounded-lg text-sm font-body transition-all duration-150 cursor-pointer justify-center lg:justify-start px-2 lg:px-3 ${
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <span className={`transition-colors shrink-0 ${active ? "text-[#2563EB]" : "text-zinc-500"}`}>
                  <Icon />
                </span>
                <span className="hidden lg:block truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer at the bottom of the sidebar */}
        <div className="mt-auto border-t border-zinc-100 pt-4 px-0.5">
          {/* Desktop profile */}
          <div className="hidden lg:flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50 border border-zinc-100/50">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              OP
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">Admin Operator</p>
              <p className="text-[10px] text-zinc-400 truncate">admin@hq.internal</p>
            </div>
          </div>

          {/* Tablet profile (collapsed) */}
          <div className="flex lg:hidden items-center justify-center">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              OP
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
