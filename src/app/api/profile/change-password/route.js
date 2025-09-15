import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../../lib/mongodb";
import User from "../../../../../models/user";
import bcrypt from "bcryptjs";
import {
  isStrongPassword,
  PASSWORD_REQUIREMENTS,
} from "../../../../../lib/password";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json(
      { message: "Both passwords required" },
      { status: 400 },
    );
  if (!isStrongPassword(newPassword))
    return NextResponse.json(
      { message: `Weak password. ${PASSWORD_REQUIREMENTS}.` },
      { status: 400 },
    );
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok)
    return NextResponse.json(
      { message: "Current password is incorrect" },
      { status: 400 },
    );
  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  await user.save();
  return NextResponse.json({ message: "Password changed" });
}
