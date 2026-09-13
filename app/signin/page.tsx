import { AuthForm } from "@/components/auth-form";
import { BrandCredit } from "@/components/brand-credit";
import { BrandLogo } from "@/components/brand-logo";

export default function SignInPage() {
  return (
    <main className="flex min-h-full flex-1">
      <aside className="hidden w-80 flex-col justify-between bg-rail px-8 py-10 text-rail-ink md:flex">
        <div>
          <BrandLogo href="/signin" />
          <p className="mt-8 text-[12px] font-semibold tracking-[0.06em] text-[#c4c6ce] uppercase">
            Approval portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Request and sign with a clear trail.
          </h1>
        </div>
        <BrandCredit />
      </aside>
      <section className="flex flex-1 items-center justify-center px-4 py-16">
        <AuthForm />
      </section>
    </main>
  );
}
