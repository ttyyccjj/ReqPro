import { redirect } from "next/navigation";
import { listLogsPage } from "@/app/actions/logs";
import { LogsList } from "@/components/logs-list";
import { getCurrentUser } from "@/lib/current-user";
import { getTranslator } from "@/lib/i18n-server";

export default async function LogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [page, t] = await Promise.all([listLogsPage(), getTranslator()]);

  return (
    <section>
      <h1 className="page-title">{t("logs.title")}</h1>
      <p className="page-lead">{t("logs.lead")}</p>
      <LogsList initialItems={page.items} initialCursor={page.nextCursor} />
    </section>
  );
}
