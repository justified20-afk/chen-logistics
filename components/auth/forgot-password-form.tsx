"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/forms/field";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { forgotPasswordAction, type ForgotPasswordResult } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgotPasswordResult | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setPending(true);
    setError(null);
    try {
      const response = await forgotPasswordAction(values);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.data ?? null);
    } catch {
      // Unexpected failures (e.g. unreachable database) must not leave
      // the submit button spinning forever.
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <p className="text-sm">{result.message}</p>
        {result.devResetUrl ? (
          <div className="space-y-2 rounded-md border border-brand/40 bg-brand/10 p-3">
            <p className="text-xs font-medium text-warning">
              Local development only — this link is shown because no mail provider is configured.
            </p>
            <Link
              href={result.devResetUrl.replace(/^https?:\/\/[^/]+/, "")}
              className="block break-all text-sm font-medium text-primary underline"
            >
              {result.devResetUrl}
            </Link>
          </div>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setResult(null)}>
          Request another link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormMessage message={error ?? undefined} />
      <Field label="Email" htmlFor="resetEmail" error={form.formState.errors.email?.message} required>
        <Input id="resetEmail" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
        {pending ? "Submitting…" : "Request reset link"}
      </Button>
    </form>
  );
}
