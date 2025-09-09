import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
// Note: Room model is exported from models/promotion.js
import Room from "../../../../models/promotion";

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
    return NextResponse.json({ message: "Failed to fetch rooms" }, { status: 500 });
  }
}

