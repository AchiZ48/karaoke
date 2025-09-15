import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectMongoDB } from "../../../../../lib/mongodb";
import User from "../../../../../models/user";

export async function POST(req) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json(
        { message: "Email, token and password are required" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    const user = await User.findOne({ email }).exec();
    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 },
      );
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ message: "Token expired" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.passwordResetTokenHash) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return NextResponse.json({ message: "Password has been reset" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to reset password" },
      { status: 500 },
    );
  }
}
