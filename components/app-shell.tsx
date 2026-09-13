"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { BrandCredit } from "@/components/brand-credit";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useInboxLive } from "@/components/inbox-live";
import { useT } from "@/components/locale-provider";
import type { User } from "@/lib/db/schema";
import type { MessageKey, Translator } from "@/lib/i18n";

const titles: { test: (path: string) => boolean; label: MessageKey; crumb: MessageKey }[] = [
  { test: (path) => path === "/", label: "nav.myRequests", crumb: "nav.myRequestsCrumb" },
  { test: (path) => path === "/requests/new", label: "nav.newRequest", crumb: "nav.newRequestCrumb" },
  { test: (path) => path.startsWith("/approvals"), label: "nav.inbox", crumb: "nav.inboxCrumb" },
  { test: (path) => path === "/requests", label: "nav.allRequests", crumb: "nav.allRequestsCrumb" },
  { test: (path) => path.startsWith("/requests/"), label: "nav.request", crumb: "nav.requestCrumb" },
  { test: (path) => path.startsWith("/settings"), label: "nav.settings", crumb: "nav.settingsCrumb" },
  { test: (path) => path.startsWith("/people"), label: "nav.people", crumb: "nav.peopleCrumb" },
  { test: (path) => path.startsWith("/logs"), label: "nav.logs", crumb: "nav.logsCrumb" },
  { test: (path) => path.startsWith("/account"), label: "nav.account", crumb: "nav.accountCrumb" },
];

function pageMeta(pathname: string, t: Translator) {
  const match = titles.find((item) => item.test(pathname));
  return {
    label: match ? t(match.label) : "ReqPro",
    crumb: match ? t(match.crumb) : t("nav.fallbackCrumb"),
  };
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
  const t = useT();
  const items = [
    { href: "/", label: t("nav.myRequests"), icon: "assignment", match: pathname === "/" },
    {
      href: "/requests/new",
      label: t("nav.newRequest"),
      icon: "post_add",
      match: pathname === "/requests/new",
    },
    {
      href: "/approvals",
      label: t("nav.inbox"),
      icon: "assignment_turned_in",
      match: pathname.startsWith("/approvals"),
      badge: count,
    },
    ...(isAdmin
      ? [
          {
            href: "/requests",
            label: t("nav.allRequests"),
            icon: "folder_open",
            match: pathname === "/requests",
          },
          {
            href: "/settings",
            label: t("nav.settings"),
            icon: "tune",
            match: pathname.startsWith("/settings"),
          },
          {
            href: "/people",
            label: t("nav.people"),
            icon: "group",
            match: pathname.startsWith("/people"),
          },
          {
            href: "/logs",
            label: t("nav.logs"),
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
              ? t("nav.inboxWaiting", { count: item.badge })
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
  const t = useT();
  const meta = pageMeta(pathname, t);
  const isAdmin = user.role === "admin";

  const sidebar = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex h-20 items-center border-b border-white/10 px-3">
          <BrandLogo />
        </div>
        <p className="label-caps px-4 py-3 text-[#c4c6ce]">{t("brand.portal")}</p>
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
            aria-label={t("header.closeMenu")}
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
              aria-label={t("header.openMenu")}
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
              title={t("header.changePassword")}
              className="min-w-0 truncate text-right leading-tight"
            >
              <span className="block truncate text-[12px] font-semibold text-ink">
                {user.name}
              </span>
              <span className="block truncate text-[11px] text-muted">
                {positionName ?? t("header.noPosition")}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <LanguageToggle />
              <form action={signOutAction}>
                <button type="submit" className="btn-ghost px-2.5 py-1 text-[12px]">
                  {t("header.signOut")}
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
