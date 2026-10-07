"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FormMessage } from "@/components/forms/field";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { registerAction } from "@/lib/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      companyName: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setPending(true);
    setError(null);
    const result = await registerAction(values);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof RegisterInput, { type: "server", message: messages[0] });
        }
      }
      return;
    }
    router.push(`/signin?registered=1`);
    router.refresh();
  };

  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormMessage message={error ?? undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Company (optional)" htmlFor="companyName" error={errors.companyName?.message}>
          <Input id="companyName" {...form.register("companyName")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message} required>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+234…" {...form.register("phone")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={errors.password?.message} required hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            checked={form.watch("acceptTerms")}
            onCheckedChange={(checked) => form.setValue("acceptTerms", checked === true)}
            aria-invalid={Boolean(errors.acceptTerms)}
          />
          <Label htmlFor="acceptTerms" className="text-sm leading-snug font-normal">
            I understand this environment contains <strong>seed/demo operational data</strong> and
            is not connected to live customer systems.
          </Label>
        </div>
        {errors.acceptTerms ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
