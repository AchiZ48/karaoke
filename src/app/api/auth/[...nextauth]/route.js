import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoDB } from "../../../../../lib/mongodb";
import User from "../../../../../models/user";
import bcrypt from 'bcryptjs'

const authOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
    
            credentials: {
                username: { label: "Username", type: "text", placeholder: "jsmith" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
            
                const {email, password} = credentials;

                try {
                    await connectMongoDB();
                    const user = await User.findOne({email});
                    if(!user){
                        return null;
                    }
                    const passwordMatch = await bcrypt.compare(password, user.password);
                    if(!passwordMatch){
                        return null;
                    }
                    return user;
                } catch (error) {
                    console.log("Error: ", error);
                }

            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    sercret: process.env.NEXTAUTH_SECRET,
    page: {
        signin: "/login"
    }
}
const handler = NextAuth(authOptions);
export {handler as GET, handler as POST };