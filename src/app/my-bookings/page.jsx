import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { connectMongoDB } from "../../../lib/mongodb";
import Booking from "../../../models/booking";
import { expireStaleBookings } from "../../../lib/bookingCleanup";
import ActionsCell from "./ActionsCell";

const STATUS_LABELS = {
  PENDING: "Pending",
  "CHECKED-IN": "Checked-In",
  CONFIRMED: "Checked-In",
  PAID: "Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const COMPLETE_STATUSES = ["PAID", "COMPLETED", "CHECKED-IN", "CONFIRMED"];

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/my-bookings");

  await connectMongoDB();
  await expireStaleBookings();
  const userId = session.user.id;
  const email = session.user.email;
  const list = await Booking.find({
    $or: [{ userId }, { customerEmail: email }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const total = list.length;
  const pending = list.filter((b) => b.status === "PENDING").length;
  const complete = list.filter((b) =>
    COMPLETE_STATUSES.includes(b.status),
  ).length;

  return (
    <main className="min-h-screen bg-white py-16 dark:bg-grey">
      <div className="container mx-auto p-4 max-w-5xl mt-5">
        {/* Welcome Box */}
        <div className="rounded-2xl mb-8 p-8 bg-gradient-to-r from-[#6768AB] to-[#210535] shadow-lg text-white py-17">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome back, {session.user.name}
          </h2>
          <div className="opacity-80">Manage you bookings and account</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Total</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Pending</div>
            <div className="text-2xl font-bold">{pending}</div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Complete</div>
            <div className="text-2xl font-bold">{complete}</div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="rounded-2xl bg-gradient-to-r from-[#6768AB] to-[#210535] shadow-lg text-white">
          <div className="px-6 pt-6 pb-2 text-lg font-semibold">
            My Bookings
          </div>

          {/* ให้ scroll แค่ตรงนี้ */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">BookingID</th>
                  <th className="px-4 py-3 text-left font-medium">Room</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b._id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium">{b.bookingId}</td>
                    <td className="px-4 py-3">
                      {b.room?.name || b.room?.number}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(b.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{b.timeSlot}</td>
                    <td className="px-4 py-3">{STATUS_LABELS[b.status] || b.status}</td>
                    <td className="px-4 py-3">
                      <ActionsCell
                        bookingId={b.bookingId}
                        status={b.status}
                        paymentMethod={b.paymentMethod}
                      />
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center opacity-70"
                    >
                      No bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
