import { redirect } from "next/navigation";
import { listLogsPage } from "@/app/actions/logs";
import { LogsList } from "@/components/logs-list";
import { getCurrentUser } from "@/lib/current-user";

export default async function LogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const page = await listLogsPage();

  return (
    <section>
      <h1 className="text-2xl font-semibold text-zinc-900">Logs</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Who changed what, newest first. The first 50 events load here; more
        appear as you scroll.
      </p>
      <LogsList initialItems={page.items} initialCursor={page.nextCursor} />
    </section>
  );
}
