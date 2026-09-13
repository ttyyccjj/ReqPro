import { redirect } from "next/navigation";
import { countInbox } from "@/app/actions/requests";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { InboxLiveProvider } from "@/components/inbox-live";
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
      <AppShell user={user} positionName={positionName}>
        {children}
      </AppShell>
    </InboxLiveProvider>
  );
}
