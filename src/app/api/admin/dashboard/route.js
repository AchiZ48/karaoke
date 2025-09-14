import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import Booking from "../../../../models/booking";
import Room from "../../../../models/room";
import Promotion from "../../../../models/promotion";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Admin only' }, { status: 403 });
    }
    await connectMongoDB();

    const [totalBookings, availableRooms] = await Promise.all([
      Booking.countDocuments({}),
      Room.countDocuments({ status: 'AVAILABLE' }),
    ]);

    const revAgg = await Booking.aggregate([
      { $match: { status: { $in: ['CONFIRMED','PAID','COMPLETED'] } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revAgg[0]?.revenue ?? 0;

    const activeCustomers = (await Booking.distinct('customerEmail')).length;

    // Trend last 6 months
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const trendAgg = await Booking.aggregate([
      { $match: { status: { $in: ['CONFIRMED','PAID','COMPLETED'] }, date: { $gte: startDate } } },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);
    const trend = trendAgg.map(t => ({ label: `${t._id.y}-${String(t._id.m).padStart(2,'0')}`, value: t.revenue }));

    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt')
      .lean();

    const [rooms, promotions] = await Promise.all([
      Room.find({}).sort({ createdAt: -1 }).lean(),
      Promotion.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    return NextResponse.json({
      stats: { totalBookings, totalRevenue, activeCustomers, availableRooms },
      trend,
      recentBookings,
      rooms,
      promotions,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard error', err);
    return NextResponse.json({ message: 'Failed to load dashboard' }, { status: 500 });
  }
}

