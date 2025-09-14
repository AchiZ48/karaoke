import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

export async function POST(req) {
  try {
    if (!stripe) {
      return NextResponse.json({ message: "Stripe not configured" }, { status: 500 });
    }
    const body = await req.json();
    const { bookingId } = body || {};
    if (!bookingId) return NextResponse.json({ message: "bookingId is required" }, { status: 400 });

    await connectMongoDB();
    const booking = await Booking.findOne({ bookingId }).lean();
    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    if (booking.paymentMethod !== "PROMPTPAY") {
      return NextResponse.json({ message: "Booking is not PromptPay" }, { status: 400 });
    }

    const amountThb = Math.round(Number(booking.totalAmount) * 100); // THB in satang
    const intent = await stripe.paymentIntents.create({
      amount: amountThb,
      currency: "thb",
      payment_method_types: ["promptpay"],
      metadata: {
        bookingId: booking.bookingId,
        customerEmail: booking.customerEmail,
      },
    });

    // Link the PaymentIntent to the booking for webhook fallback lookups
    try {
      await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { paymentIntentId: intent.id } });
    } catch {}

    // Stripe returns next_action for promptpay when confirmed on client; we can use PaymentIntent's hosted voucher
    // For simplicity, return client_secret and intent id. Client can display via Stripe.js or a separate page.
    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountThb,
      currency: "thb",
    });
  } catch (err) {
    console.error("POST /api/payments/promptpay error:", err);
    return NextResponse.json({ message: "Failed to initiate PromptPay" }, { status: 500 });
  }
}
