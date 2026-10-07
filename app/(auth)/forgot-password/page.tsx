import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="heading text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Request a reset link for your account. This deployment does not deliver email or SMS, so
          the request is recorded in-app and the link is shown here while running locally.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
