import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@/lib/supabase/server";

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
        const supabase = await createClient();

        // Upsert user in our database
        const { error } = await supabase
          .from("users")
          .upsert(
            {
              email: user.email!,
              name: user.name,
              image: user.image,
            },
            {
              onConflict: "email",
            }
          )
          .select()
          .single();

        if (error) {
          console.error("Error upserting user:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const supabase = await createClient();
        const { data: dbUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", session.user.email)
          .single();

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
