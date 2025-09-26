import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";
import Room from "../../../../../models/room";
import Promotion from "../../../../../models/promotion";
import { expireStaleBookings } from "../../../../../lib/bookingCleanup";

const TREND_STATUSES = ["CONFIRMED", "PAID", "COMPLETED"];
const ACTIVE_STATUS_MATCH = ["ACTIVE", "AVAILABLE", "OCCUPIED"];

const normalizeRoomStatus = (value) => {
  if (value === "INACTIVE") return "INACTIVE";
  if (value === "ACTIVE") return "ACTIVE";
  if (value === "MAINTENANCE") return "INACTIVE";
  if (value === "AVAILABLE" || value === "OCCUPIED") return "ACTIVE";
  return "ACTIVE";
};

const normalizeRooms = (items) =>
  Array.isArray(items)
    ? items.map((room) => ({ ...room, status: normalizeRoomStatus(room?.status) }))
    : [];

function buildMonthTrend(raw, startDate, now) {
  const map = new Map();
  for (const item of raw) {
    const label = `${item._id.y}-${String(item._id.m).padStart(2, "0")}`;
    map.set(label, item.revenue ?? 0);
  }

  const result = [];
  const cursor = new Date(startDate);
  cursor.setDate(1);
  while (cursor <= now) {
    const label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    result.push({ label, value: map.get(label) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

function buildDayTrend(raw, startDate, now) {
  const map = new Map();
  for (const item of raw) {
    const label = `${item._id.y}-${String(item._id.m).padStart(2, "0")}-${String(item._id.d).padStart(2, "0")}`;
    map.set(label, item.revenue ?? 0);
  }

  const result = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= now) {
    const label = cursor.toISOString().slice(0, 10);
    result.push({ label, value: map.get(label) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Admin only" }, { status: 403 });
    }
    await connectMongoDB();
    await expireStaleBookings();

    const { searchParams } = new URL(request.url, "http://localhost");
    const requestedScale = (searchParams.get("scale") || "month").toLowerCase();
    const scale = requestedScale === "day" ? "day" : "month";

    const [totalBookings, activeRooms] = await Promise.all([
      Booking.countDocuments({}),
      Room.countDocuments({ status: { $in: ACTIVE_STATUS_MATCH } }),
    ]);

    const revAgg = await Booking.aggregate([
      { $match: { status: { $in: TREND_STATUSES } } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revAgg[0]?.revenue ?? 0;

    const activeCustomers = (await Booking.distinct("customerEmail")).length;

    const now = new Date();
    let trendStartDate;
    let trendPipeline;

    if (scale === "day") {
      trendStartDate = new Date(now);
      trendStartDate.setDate(trendStartDate.getDate() - 29);
      trendStartDate.setHours(0, 0, 0, 0);
      trendPipeline = [
        {
          $match: {
            status: { $in: TREND_STATUSES },
            date: { $gte: trendStartDate },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$date" },
              m: { $month: "$date" },
              d: { $dayOfMonth: "$date" },
            },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
      ];
    } else {
      trendStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      trendStartDate.setHours(0, 0, 0, 0);
      trendPipeline = [
        {
          $match: {
            status: { $in: TREND_STATUSES },
            date: { $gte: trendStartDate },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$date" },
              m: { $month: "$date" },
            },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ];
    }

    const trendAgg = await Booking.aggregate(trendPipeline);
    const trend =
      scale === "day"
        ? buildDayTrend(trendAgg, trendStartDate, now)
        : buildMonthTrend(trendAgg, trendStartDate, now);

    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt",
      )
      .lean();

    const [rooms, promotions] = await Promise.all([
      Room.find({}).sort({ createdAt: -1 }).lean(),
      Promotion.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    return NextResponse.json({
      stats: { totalBookings, totalRevenue, activeCustomers, activeRooms },
      trend,
      scale,
      recentBookings,
      rooms: normalizeRooms(rooms),
      promotions,
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard error", err);
    return NextResponse.json(
      { message: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}

