import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import Booking from "../../../../models/booking";

const ALL_SLOTS = [
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

    const day = new Date(dateStr);
    if (isNaN(day.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }
    day.setHours(0, 0, 0, 0);

    await connectMongoDB();
    const activeStatuses = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const bookings = await Booking.find({
      "room.number": String(roomNumber).toUpperCase(),
      date: { $gte: day, $lt: nextDay },
      status: { $in: activeStatuses },
    })
      .select("timeSlot")
      .lean();
    const occupied = new Set((bookings || []).map((b) => b.timeSlot));

    // Filter out past slots if same day
    const now = new Date();
    const isToday = now.toDateString() === day.toDateString();
    const available = ALL_SLOTS.filter((slot) => {
      if (occupied.has(slot)) return false;
      if (!isToday) return true;
      // keep only slots ending in the future when it's today
      const end = slot.split("-")[1];
      const [eh, em] = end.split(":").map(Number);
      const slotEnd = new Date(day);
      slotEnd.setHours(eh, em, 0, 0);
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
