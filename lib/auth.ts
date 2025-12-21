import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query, queryOne } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Upsert user in our database
          await query(
            `INSERT INTO users (email, name, image)
             VALUES ($1, $2, $3)
             ON CONFLICT (email)
             DO UPDATE SET name = $2, image = $3`,
            [user.email, user.name, user.image]
          );
        } catch (error) {
          console.error("Error upserting user:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await queryOne<{ id: string }>(
          "SELECT id FROM users WHERE email = $1",
          [session.user.email]
        );

        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
