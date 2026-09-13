"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { BrandCredit } from "@/components/brand-credit";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useInboxLive } from "@/components/inbox-live";
import type { User } from "@/lib/db/schema";

const titles: { test: (path: string) => boolean; label: string; crumb: string }[] = [
  { test: (path) => path === "/", label: "My requests", crumb: "Submitted work" },
  { test: (path) => path === "/requests/new", label: "New request", crumb: "Submit" },
  { test: (path) => path.startsWith("/approvals"), label: "Inbox", crumb: "Waiting on you" },
  { test: (path) => path === "/requests", label: "All requests", crumb: "Company ledger" },
  { test: (path) => path.startsWith("/requests/"), label: "Request", crumb: "Review & sign" },
  { test: (path) => path.startsWith("/settings"), label: "Settings", crumb: "Catalog & route" },
  { test: (path) => path.startsWith("/people"), label: "People", crumb: "Access & positions" },
  { test: (path) => path.startsWith("/logs"), label: "Logs", crumb: "Audit trail" },
  { test: (path) => path.startsWith("/account"), label: "Account", crumb: "Password" },
];

function pageMeta(pathname: string) {
  return (
    titles.find((item) => item.test(pathname)) ?? {
      label: "ReqPro",
      crumb: "Approval workspace",
    }
  );
}

function navClass(active: boolean) {
  return active
    ? "flex items-center gap-2 rounded-sm bg-brand px-3 py-2 text-[13px] font-semibold text-white"
    : "flex items-center gap-2 rounded-sm px-3 py-2 text-[13px] text-[#c4c6ce] hover:bg-white/5 hover:text-white";
}

function NavItems({
  isAdmin,
  pathname,
  onNavigate,
}: {
  isAdmin: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { count } = useInboxLive();
  const items = [
    { href: "/", label: "My requests", icon: "assignment", match: pathname === "/" },
    {
      href: "/requests/new",
      label: "New request",
      icon: "post_add",
      match: pathname === "/requests/new",
    },
    {
      href: "/approvals",
      label: "Inbox",
      icon: "assignment_turned_in",
      match: pathname.startsWith("/approvals"),
      badge: count,
    },
    ...(isAdmin
      ? [
          {
            href: "/requests",
            label: "All requests",
            icon: "folder_open",
            match: pathname === "/requests",
          },
          {
            href: "/settings",
            label: "Settings",
            icon: "tune",
            match: pathname.startsWith("/settings"),
          },
          {
            href: "/people",
            label: "People",
            icon: "group",
            match: pathname.startsWith("/people"),
          },
          {
            href: "/logs",
            label: "Logs",
            icon: "history_edu",
            match: pathname.startsWith("/logs"),
          },
        ]
      : []),
  ];

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={navClass(item.match)}
          aria-current={item.match ? "page" : undefined}
          aria-label={
            item.href === "/approvals" && item.badge
              ? `Inbox, ${item.badge} waiting`
              : undefined
          }
        >
          <span className="material-symbols-outlined shrink-0" aria-hidden>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge ? (
            <span className="inline-flex min-w-4 items-center justify-center rounded-sm bg-white px-1 text-[10px] font-semibold leading-4 text-brand">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({
  user,
  positionName,
  children,
}: {
  user: User;
  positionName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const meta = pageMeta(pathname);
  const isAdmin = user.role === "admin";

  const sidebar = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex h-20 items-center border-b border-white/10 px-3">
          <BrandLogo />
        </div>
        <p className="label-caps px-4 py-3 text-[#c4c6ce]">Approval portal</p>
        <NavItems isAdmin={isAdmin} pathname={pathname} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-white/10 px-4 py-3">
        <BrandCredit />
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-canvas">
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-60 flex-col bg-rail text-rail-ink md:flex">
        {sidebar}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-60 bg-rail text-rail-ink shadow-xl">
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="flex min-h-full flex-col md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b-2 border-brand bg-panel px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-sm p-1 text-muted hover:bg-canvas md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold tracking-[0.04em] text-ink uppercase">
                {meta.label}
                <span className="mx-1.5 font-normal text-muted">/</span>
                <span className="font-normal text-muted">{meta.crumb}</span>
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/account/password"
              title="Change password"
              className="min-w-0 truncate text-right leading-tight"
            >
              <span className="block truncate text-[12px] font-semibold text-ink">
                {user.name}
              </span>
              <span className="block truncate text-[11px] text-muted">
                {positionName ?? "No position"}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <LanguageToggle />
              <form action={signOutAction}>
                <button type="submit" className="btn-ghost px-2.5 py-1 text-[12px]">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
