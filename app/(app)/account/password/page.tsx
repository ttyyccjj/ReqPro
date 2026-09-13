import { PasswordForm } from "@/components/password-form";
import { requireUser } from "@/lib/current-user";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <section className="max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">Change password</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Enter your current password, then choose a new one that is at least 8
        characters.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <PasswordForm />
      </div>
    </section>
  );
}
