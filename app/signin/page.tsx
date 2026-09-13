import { AuthForm } from "@/components/auth-form";
import { BrandCredit } from "@/components/brand-credit";
import { BrandLogo } from "@/components/brand-logo";
import { getTranslator } from "@/lib/i18n-server";

export default async function SignInPage() {
  const t = await getTranslator();
  return (
    <main className="flex min-h-full flex-1">
      <aside className="hidden min-h-full w-80 flex-col bg-rail text-rail-ink md:flex">
        <div className="px-8 pt-10">
          <BrandLogo href="/signin" />
          <p className="mt-8 text-[12px] font-semibold tracking-[0.06em] text-[#c4c6ce] uppercase">
            {t("brand.portal")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("brand.signInLead")}
          </h1>
        </div>
        <div className="mt-auto flex h-16 items-center border-t border-white/10 px-8">
          <BrandCredit />
        </div>
      </aside>
      <section className="flex flex-1 items-center justify-center px-4 py-16">
        <AuthForm />
      </section>
    </main>
  );
}
