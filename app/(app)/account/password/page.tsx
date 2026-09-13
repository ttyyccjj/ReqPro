import { PasswordForm } from "@/components/password-form";
import { requireUser } from "@/lib/current-user";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <section className="max-w-md">
      <h1 className="page-title">Change password</h1>
      <p className="page-lead">
        Enter your current password, then choose a new one that is at least 8
        characters.
      </p>
      <div className="card mt-6 p-6">
        <PasswordForm />
      </div>
    </section>
  );
}
