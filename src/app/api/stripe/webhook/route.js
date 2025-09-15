import Stripe from "stripe";
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
  : null;

export async function POST(req) {
  if (!stripe || !webhookSecret) {
    return new NextResponse("Stripe not configured", { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  try {
    // Basic visibility for debugging
    console.log("Stripe webhook event:", event.type);
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent?.metadata?.bookingId;
        await connectMongoDB();
        let res;
        if (bookingId) {
          res = await Booking.updateOne(
            { bookingId },
            { $set: { status: "PAID" } },
          );
          console.log(
            "Booking status updated by bookingId",
            bookingId,
            res.matchedCount,
            res.modifiedCount,
          );
        }
        if (!res || res.matchedCount === 0) {
          // fallback by paymentIntentId
          const pid = intent.id;
          res = await Booking.updateOne(
            { paymentIntentId: pid },
            { $set: { status: "PAID" } },
          );
          console.log(
            "Booking status updated by paymentIntentId",
            pid,
            res.matchedCount,
            res.modifiedCount,
          );
        }
        break;
      }
      case "payment_intent.payment_failed": {
        // optionally handle failures
        break;
      }
      default:
        break;
    }
    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook handling error", err);
    return new NextResponse("error", { status: 500 });
  }
}
