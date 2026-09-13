import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { InboxLink } from "@/components/inbox-link";
import type { User } from "@/lib/db/schema";

export function Nav({
  user,
  positionName,
}: {
  user: User;
  positionName: string | null;
}) {
  const isAdmin = user.role === "admin";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
            ReqPro
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              My requests
            </Link>
            <Link href="/requests/new" className="hover:text-zinc-900">
              New request
            </Link>
            <InboxLink />
            {isAdmin ? (
              <>
                <Link href="/requests" className="hover:text-zinc-900">
                  All requests
                </Link>
                <Link href="/settings" className="hover:text-zinc-900">
                  Settings
                </Link>
                <Link href="/people" className="hover:text-zinc-900">
                  People
                </Link>
                <Link href="/logs" className="hover:text-zinc-900">
                  Logs
                </Link>
              </>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/account/password"
            title="Change password"
            className="text-zinc-600 hover:text-zinc-900"
          >
            {user.name}
            <span className="ml-1 text-zinc-400">
              ({positionName ?? "No position"})
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-700 hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
