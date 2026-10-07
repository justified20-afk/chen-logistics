"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/forms/field";
import { signinSchema, type SigninInput } from "@/lib/schemas/auth";

const GENERIC_ERROR =
  "We couldn't sign you in with those details. Check your email and password and try again.";

export function SigninForm({
  oauth,
  callbackUrl,
  hasError,
}: {
  oauth: { google: boolean; github: boolean; reason: string };
  callbackUrl?: string;
  hasError: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(hasError ? GENERIC_ERROR : null);

  const form = useForm<SigninInput>({
    resolver: standardSchemaResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SigninInput) => {
    setPending(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        setError(GENERIC_ERROR);
        return;
      }
      router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
      router.refresh();
    } catch {
      setError("Sign-in is unavailable right now. Try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  const safeCallback = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

  return (
    <div className="space-y-5">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
        aria-describedby={error ? "signin-error" : undefined}
      >
        <FormMessage message={error ?? undefined} />
        {error ? <span id="signin-error" className="sr-only">{error}</span> : null}

        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {oauth.google || oauth.github ? (
        <div className="space-y-2">
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or continue with</span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {oauth.google ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void signIn("google", { callbackUrl: safeCallback })}
              >
                Google
              </Button>
            ) : null}
            {oauth.github ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void signIn("github", { callbackUrl: safeCallback })}
              >
                GitHub
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Google/GitHub sign-in is not configured in this deployment. {oauth.reason}
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Need a customer account?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
