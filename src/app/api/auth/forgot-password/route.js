import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongoDB } from "../../../../../lib/mongodb";
import User from "../../../../../models/user";
import { sendMail } from "../../../../../lib/mailer";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    const user = await User.findOne({ email }).exec();

    // Always respond 200 to avoid user enumeration, but only proceed if user exists
    if (user) {
      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = expires;
      await user.save();

      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      const html = `
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to set a new password. This link will expire in 30 minutes.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `;
      if (process.env.NODE_ENV !== "production") {
        console.log("[DEV] Password reset link:", resetUrl);
      }
      await sendMail({ to: email, subject: "Reset your password", html });
    }

    if (!user && process.env.NODE_ENV !== "production") {
      console.log("[DEV] No user found for:", email);
    }

    const payload = {
      message: "If the email exists, a reset link has been sent.",
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Failed to process request" },
      { status: 500 },
    );
  }
}
