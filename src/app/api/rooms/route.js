import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import Room from "../../../../models/room";

export async function GET(req) {
  try {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const minCapacity = Number(searchParams.get("minCapacity")) || undefined;

    const query = { status: "AVAILABLE" };
    if (type) query.type = type;
    if (minCapacity) query.capacity = { $gte: minCapacity };

    const rooms = await Room.find(query).sort({ price: 1 }).lean();
    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("GET /api/rooms error:", err);
    return NextResponse.json(
      { message: "Failed to fetch rooms" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin")
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectMongoDB();
    const body = await req.json();
    const { name, number, type, capacity, price, status } = body || {};
    if (!name || !number || !type || !capacity || !price)
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    const created = await Room.create({
      name,
      number,
      type,
      capacity,
      price,
      status: status || "AVAILABLE",
    });
    return NextResponse.json({ room: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/rooms error:", err);
    return NextResponse.json(
      { message: "Failed to create room" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin")
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectMongoDB();
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id)
      return NextResponse.json({ message: "id required" }, { status: 400 });
    await Room.updateOne({ _id: id }, { $set: updates });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("PATCH /api/rooms error:", err);
    return NextResponse.json(
      { message: "Failed to update room" },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin")
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ message: "id required" }, { status: 400 });
    await Room.deleteOne({ _id: id });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/rooms error:", err);
    return NextResponse.json(
      { message: "Failed to delete room" },
      { status: 500 },
    );
  }
}
