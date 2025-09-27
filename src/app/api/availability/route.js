import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import { addBookingDays, parseBookingDate, parseBookingDateTime, startOfBookingDay } from "../../../../lib/timezone";
import Booking from "../../../../models/booking";
import {
  bookingExpiryWindowMs,
  expireStaleBookings,
} from "../../../../lib/bookingCleanup";

const ALL_SLOTS = [
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomNumber = searchParams.get("roomNumber");
    const dateStr = searchParams.get("date"); // yyyy-mm-dd
    if (!roomNumber || !dateStr) {
      return NextResponse.json(
        { message: "roomNumber and date are required" },
        { status: 400 },
      );
    }

    const day = parseBookingDate(dateStr);
    if (!day) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }
    const nextDay = addBookingDays(day, 1);
    if (!nextDay) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }

    await connectMongoDB();
    await expireStaleBookings();

    const cutoff = new Date(Date.now() - bookingExpiryWindowMs);
    const bookings = await Booking.find({
      "room.number": String(roomNumber).toUpperCase(),
      date: { $gte: day, $lt: nextDay },
      $or: [
        // Consider these always occupying
        { status: { $in: ["CHECKED-IN", "PAID", "COMPLETED", "CONFIRMED"] } },
        // Pending but not expired (created within cutoff)
        { status: "PENDING", createdAt: { $gte: cutoff } },
      ],
    })
      .select("timeSlot")
      .lean();
    const occupied = new Set((bookings || []).map((b) => b.timeSlot));

    // Filter out past slots if same day
    const now = new Date();
    const today = startOfBookingDay(now);
    const isToday = today ? today.getTime() === day.getTime() : false;
    const available = ALL_SLOTS.filter((slot) => {
      if (occupied.has(slot)) return false;
      if (!isToday) return true;
      // keep only slots ending in the future when it's today
      const end = slot.split("-")[1];
      const slotEnd = parseBookingDateTime(dateStr, end);
      if (!slotEnd) return false;
      return slotEnd.getTime() > now.getTime();
    });

    return NextResponse.json({ available, occupied: Array.from(occupied) });
  } catch (err) {
    console.error("GET /api/availability error:", err);
    return NextResponse.json(
      { message: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}

