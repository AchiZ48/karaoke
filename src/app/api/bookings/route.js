import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectMongoDB } from "../../../../lib/mongodb";
import Booking from "../../../../models/booking";
import Room from "../../../../models/room";
import User from "../../../../models/user";
import { expireStaleBookings } from "../../../../lib/bookingCleanup";
import { sendBookingConfirmationEmail } from "../../../../lib/bookingEmails";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function isValidTimeSlot(str) {
  return /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

function normalizeEmail(str) {
  return typeof str === "string" ? str.trim().toLowerCase() : "";
}

function generateBookingId() {
  const d = new Date();
  const year = d.getFullYear();
  const rnd = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `BK${year}${rnd}`;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      roomNumber,
      date, // ISO string or yyyy-mm-dd
      timeSlot, // HH:MM-HH:MM
      numberOfPeople,
      paymentMethod, // CASH | PROMPTPAY | STRIPE
      promotionCode,
      customerName,
      customerEmail,
      customerPhone,
    } = body || {};

    if (
      !roomNumber ||
      !date ||
      !timeSlot ||
      !numberOfPeople ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const isAdmin = session.user?.role === "admin";

    const adminName =
      typeof customerName === "string" ? customerName.trim() : "";
    const adminEmail = normalizeEmail(customerEmail);
    const adminPhone =
      typeof customerPhone === "string" ? customerPhone.trim() : "";

    if (isAdmin) {
      if (!adminName || !adminEmail || !adminPhone) {
        return NextResponse.json(
          { message: "Name, email, and phone are required for admin bookings" },
          { status: 400 },
        );
      }
      if (!EMAIL_REGEX.test(adminEmail)) {
        return NextResponse.json(
          { message: "Invalid customer email format" },
          { status: 400 },
        );
      }
    } else if (!session.user?.email) {
      return NextResponse.json(
        { message: "Account email is required" },
        { status: 400 },
      );
    }

    if (!isValidTimeSlot(timeSlot)) {
      return NextResponse.json(
        { message: "Invalid timeSlot format (HH:MM-HH:MM)" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    await expireStaleBookings();

    const room = await Room.findOne({
      number: String(roomNumber).toUpperCase(),
      status: { $in: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"] },
    }).lean();
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }
    if (Number(numberOfPeople) > room.capacity) {
      return NextResponse.json(
        { message: `Exceeds room capacity (${room.capacity})` },
        { status: 400 },
      );
    }
    // Date must not be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(date);
    reqDate.setHours(0, 0, 0, 0);
    if (reqDate < today) {
      return NextResponse.json(
        { message: "Date cannot be in the past" },
        { status: 400 },
      );
    }

    // Prevent selecting a slot that already ended if booking for today
    {
      const now = new Date();
      const isToday = now.toDateString() === reqDate.toDateString();
      if (isToday) {
        const end = timeSlot.split("-")[1];
        const [eh, em] = end.split(":").map(Number);
        const slotEnd = new Date(reqDate);
        slotEnd.setHours(eh, em, 0, 0);
        if (slotEnd.getTime() <= now.getTime()) {
          return NextResponse.json(
            { message: "Selected time slot already passed" },
            { status: 400 },
          );
        }
      }
    }

    // Ensure slot availability (no existing active booking for same room/date/slot)
    const activeStatuses = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];
    const nextDay = new Date(reqDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const exists = await Booking.exists({
      "room.number": room.number,
      date: { $gte: reqDate, $lt: nextDay },
      timeSlot,
      status: { $in: activeStatuses },
    });
    if (exists) {
      return NextResponse.json(
        { message: "Selected time slot is unavailable" },
        { status: 409 },
      );
    }

    // Calculate total with optional promotion
    let totalAmount = room.price;
    if (promotionCode) {
      const Promotion = (await import("../../../../models/promotion")).default;
      const now = new Date();
      const promo = await Promotion.findOne({
        code: promotionCode,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).lean();
      if (promo) {
        if (promo.discountType === "PERCENT") {
          totalAmount = Math.max(
            0,
            Math.round(room.price * (1 - promo.discountValue / 100)),
          );
        } else if (promo.discountType === "FIXED") {
          totalAmount = Math.max(0, room.price - promo.discountValue);
        }
      }
    }

    const sessionEmail = normalizeEmail(session.user?.email);
    let bookingEmail = sessionEmail;
    let bookingName =
      session.user?.name ||
      (bookingEmail ? bookingEmail.split("@")[0] : "User");
    let bookingPhone = "";

    if (isAdmin) {
      bookingEmail = adminEmail;
      bookingName = adminName;
      bookingPhone = adminPhone;
    } else {
      if (!bookingEmail) {
        return NextResponse.json(
          { message: "Account email is required" },
          { status: 400 },
        );
      }
      const userDoc = await User.findOne({ email: bookingEmail }).lean();
      const profilePhone = userDoc?.phone;
      if (!profilePhone) {
        return NextResponse.json(
          {
            message:
              "Phone number not found on profile. Please add it in your profile.",
          },
          { status: 400 },
        );
      }
      bookingPhone = profilePhone;
    }

    const bookingDoc = {
      userId:
        !isAdmin && session.user?.id
          ? typeof session.user.id === "string"
            ? session.user.id
            : undefined
          : undefined,
      bookingId: generateBookingId(),
      room: {
        name: room.name,
        number: room.number,
        type: room.type,
        price: room.price,
      },
      customerName: bookingName,
      customerEmail: bookingEmail,
      customerPhone: bookingPhone,
      date: reqDate,
      timeSlot,
      numberOfPeople: Number(numberOfPeople),
      status: "PENDING",
      paymentMethod,
      totalAmount,
      promotionCode: promotionCode || undefined,
    };

    const created = await Booking.create(bookingDoc);
    await sendBookingConfirmationEmail(created);
    return NextResponse.json({ booking: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json(
      { message: "Failed to create booking" },
      { status: 500 },
    );
  }
}
