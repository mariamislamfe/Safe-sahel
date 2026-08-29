"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@safe-sahel/validation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
      setServerError(
        error.message === "Invalid login credentials" ? "Wrong email or password." : error.message,
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-lg px-lg py-4xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-ink-secondary">
          New to Safe Sahel?{" "}
          <Link href="/signup" className="font-medium text-turquoise-dark">
            Create an account
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            {...register("email")}
            type="email"
            className="rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise"
            placeholder="you@example.com"
          />
          {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
        </label>

        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">Password</span>
          <input
            {...register("password")}
            type="password"
            className="rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise"
          />
          {errors.password && (
            <span className="text-xs text-red-600">{errors.password.message}</span>
          )}
        </label>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-turquoise px-xl py-md font-medium text-white transition-colors hover:bg-turquoise-dark disabled:opacity-60"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
