import Link from "next/link";
import { listMine } from "@/app/actions/requests";
import { LiveRefresh } from "@/components/inbox-live";
import { RequestTable } from "@/components/request-table";
import { getTranslator } from "@/lib/i18n-server";

export default async function HomePage() {
  const [items, t] = await Promise.all([listMine(), getTranslator()]);

  return (
    <section>
      <LiveRefresh />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t("home.title")}</h1>
          <p className="page-lead">{t("home.lead")}</p>
        </div>
        <Link href="/requests/new" className="btn-primary">
          {t("nav.newRequest")}
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="panel-empty">{t("home.empty")}</p>
      ) : (
        <RequestTable items={items} />
      )}
    </section>
  );
}
