import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const providers: any[] = [
  Credentials({
    name: "Threadly demo",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Access code", type: "password" } },
    async authorize(credentials) {
      if ((process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_LOGIN === "true") && credentials?.email === "demo@threadly.app" && credentials?.password === "demo") {
        return { id: "demo@threadly.app", email: "demo@threadly.app", name: "Yadeshwar" };
      }
      return null;
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "threadly-local-development-only-secret-change-before-hosting"),
  pages: { signIn: "/" },
  session: { strategy: "jwt" },
  callbacks: {
    session({ session }) {
      if (session.user?.email === "demo@threadly.app") session.user.name = "Yadeshwar";
      return session;
    },
  },
});
