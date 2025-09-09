import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import Booking from "../../../../models/booking";
// Room model is exported from models/promotion.js (naming quirk in repo)
import Room from "../../../../models/promotion";

function isValidTimeSlot(str) {
  return /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

function generateBookingId() {
  const d = new Date();
  const year = d.getFullYear();
  const rnd = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `BK${year}${rnd}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      roomNumber,
      date, // ISO string or yyyy-mm-dd
      timeSlot, // HH:MM-HH:MM
      numberOfPeople,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod, // CASH | PROMPTPAY | STRIPE
    } = body || {};

    if (!roomNumber || !date || !timeSlot || !numberOfPeople || !customerName || !customerEmail || !customerPhone || !paymentMethod) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    if (!isValidTimeSlot(timeSlot)) {
      return NextResponse.json({ message: "Invalid timeSlot format (HH:MM-HH:MM)" }, { status: 400 });
    }

    await connectMongoDB();

    const room = await Room.findOne({ number: String(roomNumber).toUpperCase(), status: { $in: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"] } }).lean();
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }
    if (Number(numberOfPeople) > room.capacity) {
      return NextResponse.json({ message: `Exceeds room capacity (${room.capacity})` }, { status: 400 });
    }

    const bookingDoc = {
      bookingId: generateBookingId(),
      room: {
        name: room.name,
        number: room.number,
        type: room.type,
        price: room.price,
      },
      customerName,
      customerEmail,
      customerPhone,
      date: new Date(date),
      timeSlot,
      numberOfPeople: Number(numberOfPeople),
      status: "PENDING",
      paymentMethod,
      totalAmount: room.price, // simple: flat per booking as in seed
    };

    const created = await Booking.create(bookingDoc);
    return NextResponse.json({ booking: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ message: "Failed to create booking" }, { status: 500 });
  }
}

