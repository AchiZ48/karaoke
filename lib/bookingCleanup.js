import Booking from "../models/booking";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const AUTO_CANCEL_METHODS = ["PROMPTPAY", "STRIPE"];

export async function expireStaleBookings(now = new Date()) {
  const cutoff = new Date(now.getTime() - FIFTEEN_MINUTES_MS);

  const result = await Booking.updateMany(
    {
      status: "PENDING",
      paymentMethod: { $in: AUTO_CANCEL_METHODS },
      createdAt: { $lt: cutoff },
    },
    { $set: { status: "CANCELLED" } },
  );

  return result?.modifiedCount ?? result?.nModified ?? 0;
}

export const bookingExpiryWindowMs = FIFTEEN_MINUTES_MS;
