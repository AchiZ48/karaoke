import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import User from "../../../../models/user";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Admin only' }, { status: 403 });
  }
  await connectMongoDB();
  const users = await User.find({}, { name: 1, email: 1, phone: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ users });
}

