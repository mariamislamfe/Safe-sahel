"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@safe-sahel/validation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
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
    defaultValues: { role: "guest" },
  });

  const role = watch("role");

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName, role: values.role } },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center gap-md px-lg py-4xl text-center">
        <h1 className="font-display text-2xl font-bold">Check your email</h1>
        <p className="text-ink-secondary">
          We sent a confirmation link — open it to activate your account, then come back and log in.
        </p>
        <Link href="/login" className="font-medium text-turquoise-dark">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-lg px-lg py-4xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-ink-secondary">
          Already have one?{" "}
          <Link href="/login" className="font-medium text-turquoise-dark">
            Log in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
        <div className="flex rounded-md border border-border p-xs">
          {(["guest", "owner"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setValue("role", option)}
              className={`flex-1 rounded-sm px-md py-sm text-sm font-medium capitalize transition-colors ${
                role === option ? "bg-turquoise text-white" : "text-ink-secondary"
              }`}
            >
              {option === "guest" ? "I'm renting" : "I'm hosting"}
            </button>
          ))}
        </div>

        <Field label="Full name" error={errors.fullName?.message}>
          <input {...register("fullName")} className={inputClass} placeholder="Sara Ahmed" />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <input
            {...register("password")}
            type="password"
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </Field>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-turquoise px-xl py-md font-medium text-white transition-colors hover:bg-turquoise-dark disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </main>
  );
}

const inputClass =
  "rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
