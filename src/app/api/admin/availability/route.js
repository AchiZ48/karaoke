import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";
import Room from "../../../../../models/room";
import { expireStaleBookings } from "../../../../../lib/bookingCleanup";
import { TIME_SLOTS } from "../../../../../lib/timeSlots";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];


function normalizeRoomStatus(value) {
  if (value === "ACTIVE" || value === "INACTIVE") return value;
  if (value === "AVAILABLE" || value === "OCCUPIED") return "ACTIVE";
  if (value === "MAINTENANCE") return "INACTIVE";
  return value || "ACTIVE";
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

    const { searchParams } = new URL(request.url, "http://localhost");
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    await connectMongoDB();
    await expireStaleBookings();

    const [roomsRaw, bookingsRaw] = await Promise.all([
      Room.find({}).sort({ createdAt: -1 }).lean(),
      Booking.find({
        date: { $gte: startOfDay, $lt: endOfDay },
        status: { $in: ACTIVE_STATUSES },
      })
        .select(
          "bookingId customerName customerPhone room number date timeSlot status",
        )
        .lean(),
    ]);

    const bookingsByRoom = new Map();
    for (const booking of bookingsRaw) {
      const roomNumber = normalizeRoomNumber(booking?.room?.number);
      if (!roomNumber || !booking?.timeSlot) continue;
      if (!bookingsByRoom.has(roomNumber)) {
        bookingsByRoom.set(roomNumber, new Map());
      }
      bookingsByRoom.get(roomNumber).set(booking.timeSlot, booking);
    }

    const rooms = roomsRaw.map((room) => {
      const roomNumber = normalizeRoomNumber(room?.number);
      const slotMap = roomNumber ? bookingsByRoom.get(roomNumber) : undefined;
      return {
        id: room?._id?.toString() ?? null,
        name: room?.name ?? null,
        number: room?.number ?? null,
        status: normalizeRoomStatus(room?.status),
        slots: TIME_SLOTS.map((slot) => {
          const booking = slotMap?.get(slot);
          return {
            slot,
            status: booking ? "BOOKED" : "AVAILABLE",
            bookingId: booking?.bookingId ?? null,
            bookingStatus: booking?.status ?? null,
            customerName: booking?.customerName ?? null,
            customerPhone: booking?.customerPhone ?? null,
          };
        }),
      };
    });

    return NextResponse.json({
      date: startOfDay.toISOString().slice(0, 10),
      timeSlots: TIME_SLOTS,
      rooms,
    });
  } catch (err) {
    console.error("GET /api/admin/availability error", err);
    return NextResponse.json(
      { message: "Failed to load availability" },
      { status: 500 },
    );
  }
}
