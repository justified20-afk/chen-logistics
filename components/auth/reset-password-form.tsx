"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/forms/field";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { resetPasswordAction } from "@/lib/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setPending(true);
    setError(null);
    try {
      const response = await resetPasswordAction(values);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/signin"), 1500);
    } catch {
      // Unexpected failures (e.g. unreachable database) must not leave
      // the submit button spinning forever.
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-success">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        Password updated. Redirecting to sign in…
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormMessage message={error ?? undefined} />
      <Field label="New password" htmlFor="newPassword" error={form.formState.errors.password?.message} required hint="At least 8 characters.">
        <Input id="newPassword" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={form.formState.errors.confirmPassword?.message} required>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Updating…" : "Update password"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
