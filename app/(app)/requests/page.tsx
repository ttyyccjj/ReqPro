import { redirect } from "next/navigation";
import { listAll } from "@/app/actions/requests";
import { RequestTable } from "@/components/request-table";
import { getCurrentUser } from "@/lib/current-user";
import { getTranslator } from "@/lib/i18n-server";

export default async function AllRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [items, t] = await Promise.all([listAll(), getTranslator()]);

  return (
    <section>
      <h1 className="page-title">{t("allRequests.title")}</h1>
      <p className="page-lead">{t("allRequests.lead")}</p>

      {items.length === 0 ? (
        <p className="panel-empty">{t("allRequests.empty")}</p>
      ) : (
        <RequestTable items={items} showRequester />
      )}
    </section>
  );
}
