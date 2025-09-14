import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import Promotion from "../../../../models/promotion";

export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active");
    const now = new Date();

    const query = {};
    if (activeOnly) {
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    const promos = await Promotion.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ promotions: promos });
  } catch (err) {
    console.error("GET /api/promotions error:", err);
    return NextResponse.json({ message: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Admin only' }, { status: 403 });
    await connectMongoDB();
    const body = await req.json();
    const { code, name, discountType, discountValue, startDate, endDate, isActive } = body || {};
    if (!code || !name || !discountType || discountValue == null || !startDate || !endDate) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    const created = await Promotion.create({ code, name, discountType, discountValue, startDate, endDate, isActive: !!isActive });
    return NextResponse.json({ promotion: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/promotions error:', err);
    return NextResponse.json({ message: 'Failed to create promotion' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Admin only' }, { status: 403 });
    await connectMongoDB();
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    await Promotion.updateOne({ _id: id }, { $set: updates });
    return NextResponse.json({ message: 'Updated' });
  } catch (err) {
    console.error('PATCH /api/promotions error:', err);
    return NextResponse.json({ message: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Admin only' }, { status: 403 });
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    await Promotion.deleteOne({ _id: id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /api/promotions error:', err);
    return NextResponse.json({ message: 'Failed to delete promotion' }, { status: 500 });
  }
}
