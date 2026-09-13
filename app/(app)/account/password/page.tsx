import { PasswordForm } from "@/components/password-form";
import { requireUser } from "@/lib/current-user";
import { getTranslator } from "@/lib/i18n-server";

export default async function ChangePasswordPage() {
  await requireUser();
  const t = await getTranslator();

  return (
    <section className="max-w-md">
      <h1 className="page-title">{t("account.title")}</h1>
      <p className="page-lead">{t("account.lead")}</p>
      <div className="card mt-6 p-6">
        <PasswordForm />
      </div>
    </section>
  );
}
