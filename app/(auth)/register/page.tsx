import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="heading text-2xl font-semibold tracking-tight">Create a customer account</h1>
        <p className="text-sm text-muted-foreground">
          Self-registration opens the <strong>customer portal</strong> so you can follow your own
          shipments, timelines and invoices. Operations staff accounts are provisioned by an
          administrator.
        </p>
      </div>

      <RegisterForm />

      <p className="text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
