import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: PageProps<"/reset-password/[token]">): Promise<React.JSX.Element> {
  const { token } = await params;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="heading text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          The reset link expires 30 minutes after it was requested and can only be used once.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
