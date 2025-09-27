import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoDB } from "../../../../../lib/mongodb";
import User from "../../../../../models/user";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials || {};
        if (!email || !password) return null;

        await connectMongoDB();
        // à¸–à¹‰à¸²à¹ƒà¸™ schema à¹ƒà¸ªà¹ˆ select:false à¸—à¸µà¹ˆ password à¹ƒà¸«à¹‰à¹€à¸•à¸´à¸¡ .select("+password")
        const user = await User.findOne({ email }).lean();
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // à¸„à¸·à¸™ plain object à¸žà¸£à¹‰à¸­à¸¡ role
        return {
          id: user._id.toString(),
          name: user.name || "",
          email: user.email,
          role: user.role || "user",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 10 * 60,
  },
  jwt: {
    maxAge: 10 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith(`${baseUrl}/api/auth/signout`)) {
        return baseUrl;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch (error) {
        return baseUrl;
      }

      return baseUrl;
    },
    async jwt({ token, user }) {
      // à¹ƒà¸ªà¹ˆà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ user à¸¥à¸‡ token à¸•à¸­à¸™à¸¥à¹‡à¸­à¸à¸­à¸´à¸™
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // à¸ªà¹ˆà¸‡ role à¹„à¸›à¸à¸±à¹ˆà¸‡ client
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



