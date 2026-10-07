import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { oauthConfig } from "@/lib/env";
import { SigninForm } from "@/components/auth/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const query = await searchParams;
  const callbackUrl = typeof query.callbackUrl === "string" ? query.callbackUrl : undefined;
  const error = query.error;
  const registered = Boolean(query.registered);
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="heading text-2xl font-semibold tracking-tight">Sign in to operations</h1>
        <p className="text-sm text-muted-foreground">
          Use your work account. Access is limited by role — the server enforces every permission.
        </p>
      </div>

      {registered ? (
        <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Account created. Sign in to open your customer portal.
        </p>
      ) : null}

      <SigninForm oauth={oauthConfig()} callbackUrl={callbackUrl} hasError={Boolean(error)} />
    </div>
  );
}
