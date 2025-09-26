import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";
import Room from "../../../../../models/room";
import Promotion from "../../../../../models/promotion";
import { expireStaleBookings } from "../../../../../lib/bookingCleanup";
import { TIME_SLOTS, getCurrentTimeSlot } from "../../../../../lib/timeSlots";

const TREND_STATUSES = ["CONFIRMED", "PAID", "COMPLETED"];
const ACTIVE_ROOM_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];

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

function normalizeRoomNumber(value) {
  return value ? String(value).trim().toUpperCase() : "";
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

    const totalBookings = await Booking.countDocuments({});

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

    const currentSlot = getCurrentTimeSlot(now, TIME_SLOTS);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [roomsRaw, promotions, slotBookingsRaw] = await Promise.all([
      Room.find({}).sort({ createdAt: -1 }).lean(),
      Promotion.find({}).sort({ createdAt: -1 }).lean(),
      currentSlot
        ? Booking.find({
            date: { $gte: startOfDay, $lt: endOfDay },
            timeSlot: currentSlot,
            status: { $in: ACTIVE_ROOM_BOOKING_STATUSES },
          })
            .select(
              "bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt",
            )
            .lean()
        : Promise.resolve([]),
    ]);

    const occupiedNumbers = new Map(
      slotBookingsRaw.map((booking) => [
        normalizeRoomNumber(booking?.room?.number),
        booking,
      ]),
    );

    const rooms = roomsRaw.map((room) => {
      const normalizedNumber = normalizeRoomNumber(room?.number);
      const activeBooking = normalizedNumber
        ? occupiedNumbers.get(normalizedNumber)
        : undefined;
      const liveStatus =
        room.status === "MAINTENANCE"
          ? "MAINTENANCE"
          : activeBooking
          ? "OCCUPIED"
          : "AVAILABLE";
      return {
        ...room,
        liveStatus,
        activeBookingId: activeBooking?.bookingId ?? null,
        activeBookingTimeSlot: activeBooking?.timeSlot ?? null,
        activeBookingDate: activeBooking?.date ?? null,
      };
    });

    const availableRooms = rooms.filter((room) => room.liveStatus === "AVAILABLE").length;

    const mergedRecentBookings = [...recentBookings];
    for (const booking of slotBookingsRaw) {
      if (!mergedRecentBookings.some((b) => b.bookingId === booking.bookingId)) {
        mergedRecentBookings.push(booking);
      }
    }

    return NextResponse.json({
      stats: { totalBookings, totalRevenue, activeCustomers, availableRooms },
      trend,
      scale,
      recentBookings: mergedRecentBookings,
      rooms,
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
