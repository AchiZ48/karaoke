import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import User from "../../../../models/user";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ user: { name: user.name, email: user.email, phone: user.phone } });
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { name, phone } = await req.json();
  if (!name || !phone) return NextResponse.json({ message: 'Name and phone are required' }, { status: 400 });
  await connectMongoDB();
  await User.updateOne({ email: session.user.email }, { $set: { name, phone } });
  return NextResponse.json({ message: 'Updated' });
}

