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
        // ถ้าใน schema ใส่ select:false ที่ password ให้เติม .select("+password")
        const user = await User.findOne({ email }).lean();
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // คืน plain object พร้อม role
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
    async jwt({ token, user }) {
      // ใส่ข้อมูล user ลง token ตอนล็อกอิน
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // ส่ง role ไปฝั่ง client
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
