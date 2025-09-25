import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";
import Room from "../../../../../models/room";
import { expireStaleBookings } from "../../../../../lib/bookingCleanup";

export async function GET(_req, context) {
  try {
    const { bookingId } = (await context.params) || {};
    if (!bookingId)
      return NextResponse.json(
        { message: "bookingId required" },
        { status: 400 },
      );
    await connectMongoDB();
    await expireStaleBookings();
    const doc = await Booking.findOne({ bookingId });
    if (!doc)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    const booking = doc.toObject();
    return NextResponse.json({ booking });
  } catch (err) {
    console.error("GET /api/bookings/[bookingId] error:", err);
    return NextResponse.json(
      { message: "Failed to fetch booking" },
      { status: 500 },
    );
  }
}

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { bookingId } = (await context.params) || {};
    if (!bookingId)
      return NextResponse.json(
        { message: "bookingId required" },
        { status: 400 },
      );
    const body = await req.json();
    const action = body?.action;
    const desiredStatus = body?.status;
    const newDate = body?.date; // yyyy-mm-dd
    const newTimeSlot = body?.timeSlot; // HH:MM-HH:MM

    await connectMongoDB();
    await expireStaleBookings();
    const booking = await Booking.findOne({ bookingId });
    if (!booking)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const isOwner =
      session.user?.email && booking.customerEmail === session.user.email;
    const isAdmin = session.user?.role === "admin";

    if (action === "cancel") {
      if (!isOwner && !isAdmin)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status)) {
        return NextResponse.json(
          { message: "Cannot cancel this booking" },
          { status: 400 },
        );
      }
      booking.status = "CANCELLED";
      await booking.save();
      return NextResponse.json({ booking });
    }

    if (typeof desiredStatus === "string") {
      if (!isAdmin)
        return NextResponse.json({ message: "Admin only" }, { status: 403 });
      booking.status = desiredStatus;
      await booking.save();
      return NextResponse.json({ booking });
    }

    // Admin reschedule/edit minimal: date + timeSlot
    if (isAdmin && (newDate || newTimeSlot)) {
      if (!newDate || !newTimeSlot)
        return NextResponse.json(
          { message: "date and timeSlot are required" },
          { status: 400 },
        );
      // Validate format similar to bookings POST
      const isValidTimeSlot =
        /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(newTimeSlot);
      if (!isValidTimeSlot)
        return NextResponse.json(
          { message: "Invalid timeSlot" },
          { status: 400 },
        );
      const reqDate = new Date(newDate);
      reqDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reqDate < today)
        return NextResponse.json(
          { message: "Date cannot be in the past" },
          { status: 400 },
        );
      // If today, ensure end time not passed
      const now = new Date();
      const isToday = now.toDateString() === reqDate.toDateString();
      if (isToday) {
        const [_, end] = newTimeSlot.split("-");
        const [eh, em] = end.split(":").map(Number);
        const slotEnd = new Date(reqDate);
        slotEnd.setHours(eh, em, 0, 0);
        if (slotEnd.getTime() <= now.getTime())
          return NextResponse.json(
            { message: "Selected time slot already passed" },
            { status: 400 },
          );
      }
      // Check availability for same room/date/slot
      const activeStatuses = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];
      const nextDay = new Date(reqDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const exists = await Booking.exists({
        "room.number": booking.room.number,
        date: { $gte: reqDate, $lt: nextDay },
        timeSlot: newTimeSlot,
        status: { $in: activeStatuses },
        bookingId: { $ne: booking.bookingId },
      });
      if (exists)
        return NextResponse.json(
          { message: "Selected time slot is unavailable" },
          { status: 409 },
        );
      booking.date = reqDate;
      booking.timeSlot = newTimeSlot;
      await booking.save();
      return NextResponse.json({ booking });
    }

    return NextResponse.json({ message: "No changes" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/bookings/[bookingId] error:", err);
    return NextResponse.json(
      { message: "Failed to update booking" },
      { status: 500 },
    );
  }
}
