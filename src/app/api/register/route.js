import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import User from "../../../../models/user";
import bcrypt from "bcryptjs";
import {
  isStrongPassword,
  PASSWORD_REQUIREMENTS,
} from "../../../../lib/password";

export async function POST(req) {
  try {
    const { name, email, password, phone } = await req.json();
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { message: "Name, email, phone and password are required" },
        { status: 400 },
      );
    }
    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { message: `Weak password. ${PASSWORD_REQUIREMENTS}.` },
        { status: 400 },
      );
    }
    const hashPassword = await bcrypt.hash(password, 10);

    await connectMongoDB();
    await User.create({ name, email, password: hashPassword, phone });

    return NextResponse.json(
      { message: "Register Successfully." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "An error occured while registering the user." },
      { status: 500 },
    );
  }
}
