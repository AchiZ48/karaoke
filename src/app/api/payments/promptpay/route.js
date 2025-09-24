import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
  : null;

export async function POST(req) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { message: "Stripe not configured" },
        { status: 500 },
      );
    }
    const body = await req.json();
    const { bookingId } = body || {};
    if (!bookingId)
      return NextResponse.json(
        { message: "bookingId is required" },
        { status: 400 },
      );

    await connectMongoDB();
    const booking = await Booking.findOne({ bookingId }).lean();
    if (!booking)
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 },
      );
    if (booking.paymentMethod !== "PROMPTPAY") {
      return NextResponse.json(
        { message: "Booking is not PromptPay" },
        { status: 400 },
      );
    }
    // Block initiating payment if booking expired unpaid (>15m)
    if (
      booking.status === "PENDING" &&
      booking.createdAt &&
      Date.now() - new Date(booking.createdAt).getTime() > 15 * 60 * 1000
    ) {
      return NextResponse.json(
        {
          message:
            "Booking payment window expired. Please create a new booking.",
        },
        { status: 400 },
      );
    }

    const amountThb = Math.round(Number(booking.totalAmount) * 100); // THB in satang
    const intent = await stripe.paymentIntents.create({
      amount: amountThb,
      currency: "thb",
      payment_method_types: ["promptpay"],
      confirm: true,
      payment_method_data: {
        type: "promptpay",
        billing_details: {
          name: booking.customerName || undefined,
          email: booking.customerEmail || undefined,
          phone: booking.customerPhone || undefined,
        },
      },
      metadata: {
        bookingId: booking.bookingId,
        customerEmail: booking.customerEmail,
      },
    });

    // Link the PaymentIntent to the booking for webhook fallback lookups
    try {
      await Booking.updateOne(
        { bookingId: booking.bookingId },
        { $set: { paymentIntentId: intent.id } },
      );
    } catch {}

    const nextAction = intent?.next_action?.promptpay_display_qr_code || null;
    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountThb,
      currency: "thb",
      nextAction,
    });
  } catch (err) {
    console.error("POST /api/payments/promptpay error:", err);
    return NextResponse.json(
      { message: "Failed to initiate PromptPay" },
      { status: 500 },
    );
  }
}
