import { redirect } from "next/navigation";
import { countInbox } from "@/app/actions/requests";
import { auth } from "@/auth";
import { InboxLiveProvider } from "@/components/inbox-live";
import { Nav } from "@/components/nav";
import { getCurrentUser, getPositionName } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) {
    const session = await auth();
    redirect(session ? "/api/session/clear" : "/signin");
  }

  const [positionName, inboxCount] = await Promise.all([
    getPositionName(user.positionId),
    countInbox(),
  ]);

  return (
    <InboxLiveProvider initialCount={inboxCount}>
      <Nav user={user} positionName={positionName} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </InboxLiveProvider>
  );
}
