import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, ensureSchema } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { writeSystemLog } from "@/lib/system-log";
import { signInSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await ensureSchema();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user) return null;

        const matches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!matches || !user.active) return null;

        await writeSystemLog({
          actor: { id: user.id, name: user.name },
          action: "account.signed_in",
          summary: "Signed in",
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? token.sub ?? "");
      session.user.role =
        token.role === "admin" || token.role === "manager" ? "admin" : "member";
      return session;
    },
  },
});
