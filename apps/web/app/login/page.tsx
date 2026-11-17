"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@safe-sahel/validation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { authDict } from "@/lib/i18n/auth";

export default function LoginPage() {
  const router = useRouter();
  const t = authDict[useLocale()];
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setServerError(error.message === "Invalid login credentials" ? t.login.wrong : error.message);
      return;
    }

    // Only same-site paths — never an open redirect.
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(
      redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/",
    );
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-lg px-lg py-4xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.login.title}</h1>
        <p className="text-sm text-ink-secondary">
          {t.login.newHere}{" "}
          <Link href="/signup" className="font-medium text-turquoise-dark">
            {t.login.create}
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.email}</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            dir="ltr"
            className="rounded-xl border border-border bg-surface px-md py-2.5 text-ink outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
            placeholder="you@example.com"
          />
          {errors.email && <span className="text-xs text-red-600">{t.errors.email}</span>}
        </label>

        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.password}</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="current-password"
            className="rounded-xl border border-border bg-surface px-md py-2.5 text-ink outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
          />
          {errors.password && (
            <span className="text-xs text-red-600">{t.errors.passwordEmpty}</span>
          )}
        </label>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-turquoise px-xl py-md font-semibold text-white transition-colors hover:bg-turquoise-dark disabled:opacity-60"
        >
          {isSubmitting ? t.login.submitting : t.login.submit}
        </button>
      </form>
    </main>
  );
}
