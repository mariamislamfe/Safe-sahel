"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalizePhone, signUpSchema, type SignUpInput } from "@safe-sahel/validation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { authDict } from "@/lib/i18n/auth";
import { TERMS_VERSION } from "@/lib/legal";
import { Icon } from "@/components/admin/icons";

export default function SignUpPage() {
  const router = useRouter();
  const t = authDict[useLocale()];
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: "guest", phone: "" },
  });

  const role = watch("role");
  const host = role === "owner";
  // Schema messages are codes/English defaults — show them in the current language.
  const err = (field: keyof typeof errors, fallback: string) => {
    const m = errors[field]?.message;
    return m ? (t.errors[m] ?? fallback) : undefined;
  };

  // "Register as a Founding Host" links here with ?role=owner.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "owner") {
      Promise.resolve().then(() => setValue("role", "owner"));
    }
  }, [setValue]);

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // handle_new_user() copies full_name, role and phone into the profile.
        data: {
          full_name: values.fullName,
          role: values.role,
          phone: normalizePhone(values.phone),
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    if (data.session) {
      router.push(host ? "/owner" : "/");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center gap-md px-lg py-4xl text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-turquoise-light text-turquoise-dark">
          <Icon name="inbox" className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">{t.signup.checkEmailTitle}</h1>
        <p className="text-ink-secondary">{t.signup.checkEmailBody}</p>
        <Link href="/login" className="font-medium text-turquoise-dark">
          {t.signup.goLogin}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-lg px-lg py-3xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.signup.title}</h1>
        <p className="text-sm text-ink-secondary">
          {t.signup.haveOne}{" "}
          <Link href="/login" className="font-medium text-turquoise-dark">
            {t.signup.login}
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-lg rounded-3xl border border-border bg-surface p-lg shadow-sm sm:p-xl"
      >
        <div className="flex flex-col gap-xs">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-soft p-1">
            {(["guest", "owner"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setValue("role", option, { shouldValidate: !!errors.phone })}
                aria-pressed={role === option}
                className={`flex items-center justify-center gap-xs rounded-lg px-md py-2.5 text-sm font-medium transition ${
                  role === option ? "bg-surface text-ink shadow-sm" : "text-ink-secondary"
                }`}
              >
                <Icon name={option === "guest" ? "search" : "home"} className="size-4" />
                {option === "guest" ? t.signup.renting : t.signup.hosting}
              </button>
            ))}
          </div>
          {host && <p className="text-xs text-ink-secondary">{t.signup.hostingHint}</p>}
        </div>

        <Field label={t.signup.fullName} error={err("fullName", t.errors.fullName!)}>
          <input
            {...register("fullName")}
            autoComplete="name"
            className={inputClass}
            placeholder={t.signup.fullNamePh}
          />
        </Field>

        <Field
          label={t.phone.label}
          badge={host ? undefined : t.phone.optional}
          hint={host ? t.phone.hostHint : t.phone.guestHint}
          error={err("phone", t.errors.phone_invalid!)}
        >
          <input
            {...register("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            className={`${inputClass} text-start`}
            placeholder={t.phone.placeholder}
          />
        </Field>

        <Field label={t.email} error={err("email", t.errors.email!)}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            dir="ltr"
            className={`${inputClass} text-start`}
            placeholder="you@example.com"
          />
        </Field>

        <Field label={t.password} error={err("password", t.errors.password!)}>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className={inputClass}
            placeholder={t.passwordPh}
          />
        </Field>

        <div className="flex flex-col gap-xs">
          <label className="flex items-start gap-sm text-sm">
            <input
              type="checkbox"
              {...register("acceptTerms")}
              className="mt-0.5 size-4 shrink-0 accent-turquoise"
            />
            <span>
              {t.signup.acceptPrefix}{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium text-turquoise-dark underline"
              >
                {t.signup.terms}
              </Link>{" "}
              {t.signup.and}{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-turquoise-dark underline"
              >
                {t.signup.privacy}
              </Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <span className="text-xs text-red-600">{t.errors.terms_required}</span>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-turquoise px-xl py-md font-semibold text-white transition-colors hover:bg-turquoise-dark disabled:opacity-60"
        >
          {isSubmitting ? t.signup.submitting : t.signup.submit}
        </button>
      </form>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-md py-2.5 text-ink outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20";

function Field({
  label,
  badge,
  hint,
  error,
  children,
}: {
  label: string;
  badge?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="flex items-center gap-xs text-sm font-medium text-ink">
        {label}
        {badge && (
          <span className="rounded-full bg-surface-soft px-sm text-[11px] font-normal text-ink-secondary">
            {badge}
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="text-xs text-ink-secondary">{hint}</span>
      )}
    </label>
  );
}
