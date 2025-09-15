import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { connectMongoDB } from "../../../lib/mongodb";
import Booking from "../../../models/booking";
import ActionsCell from "./ActionsCell";

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/my-bookings");

  await connectMongoDB();
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
    ["PAID", "COMPLETED", "CONFIRMED"].includes(b.status),
  ).length;

  return (
    <main>
      <div className="container mx-auto p-4 max-w-5xl">
        <h1 className="text-2xl font-semibold mb-4">My Bookings</h1>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded">
            <div className="text-sm opacity-70">Total</div>
            <div className="text-xl">{total}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm opacity-70">Pending</div>
            <div className="text-xl">{pending}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm opacity-70">Complete</div>
            <div className="text-xl">{complete}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded border-neutral-200 dark:border-white/10">
            <thead className="bg-gray-100 dark:bg-white/5 text-black dark:text-white/80">
              <tr>
                <th className="px-3 py-2 text-left">BookingID</th>
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr
                  key={b._id}
                  className="border-t border-neutral-200 dark:border-white/10"
                >
                  <td className="px-3 py-2 font-medium">{b.bookingId}</td>
                  <td className="px-3 py-2">
                    {b.room?.name || b.room?.number}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(b.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{b.timeSlot}</td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2">
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
                  <td colSpan={6} className="px-3 py-4 text-center opacity-70">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
