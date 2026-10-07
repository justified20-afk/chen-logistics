import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { getAuthSecret } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import { toDomain } from "@/lib/db";
import { signinSchema } from "@/lib/schemas/auth";
import type { UserRecord } from "@/types/domain";

/** Users live in MongoDB; we resolve them ourselves so RBAC stays server-side. */
async function findUserByEmail(email: string) {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ email: email.toLowerCase() } as never);
  return doc ? toDomain<UserRecord & { passwordHash?: string }>(doc) : null;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = signinSchema.safeParse(credentials);
      // Always fail identically: never reveal whether an address exists.
      if (!parsed.success) return null;

      const user = await findUserByEmail(parsed.data.email);
      if (!user?.passwordHash || user.status !== "active") return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  secret: getAuthSecret(),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/signin", error: "/signin" },
  providers,
  callbacks: {
    /**
     * OAuth accounts are only accepted when an operator has already created a
     * matching user record. Self-service sign-up creates a customer-portal
     * account through /register instead.
     */
    async signIn({ account }) {
      if (account?.provider === "credentials") return true;
      const email =
        typeof account?.provider_email === "string" ? account.provider_email.toLowerCase() : null;
      if (!email) return false;
      const user = await findUserByEmail(email);
      return Boolean(user && user.status === "active");
    },
    async jwt({ token, user }) {
      if (user && typeof user.id === "string") token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      const subject = typeof token.sub === "string" ? token.sub : undefined;
      if (subject) session.user.id = subject;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
