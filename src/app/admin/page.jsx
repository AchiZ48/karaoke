// app/admin/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { connectMongoDB } from "../../../lib/mongodb";
import Booking from "../../../models/booking";
import Room from "../../../models/room";
import Promotion from "../../../models/promotion";
import { expireStaleBookings } from "../../../lib/bookingCleanup";
import AdminDashboardClient from "../components/admin/AdminDashboardClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user?.role !== "admin") redirect("/");

  await connectMongoDB();
  await expireStaleBookings();

  // ----- Stats -----
  const activeStatusMatch = ["ACTIVE", "AVAILABLE", "OCCUPIED"];
  const [totalBookings, activeRooms] = await Promise.all([
    Booking.countDocuments({}),
    Room.countDocuments({ status: { $in: activeStatusMatch } }),
  ]);

  const revenueStatuses = ["CHECKED-IN", "PAID", "COMPLETED", "CONFIRMED"];

  const revAgg = await Booking.aggregate([
    { $match: { status: { $in: revenueStatuses } } },
    { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
  ]);
  const totalRevenue = revAgg[0]?.revenue ?? 0;

  const activeCustomers = (await Booking.distinct("customerEmail")).length;

  // ----- Revenue trend (last 6 months) -----
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendAgg = await Booking.aggregate([
    {
      $match: {
        status: { $in: revenueStatuses },
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { y: { $year: "$date" }, m: { $month: "$date" } },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]);
  const trendRaw = trendAgg.map((t) => ({
    label: `${t._id.y}-${String(t._id.m).padStart(2, "0")}`,
    value: t.revenue,
  }));

  // ----- Recent bookings / Rooms / Promotions -----
  const recentBookingsRaw = await Booking.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select(
      "bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt",
    )
    .lean();

  const [roomsRaw, promotionsRaw] = await Promise.all([
    Room.find({}).sort({ createdAt: -1 }).lean(),
    Promotion.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  // JSON hack: convert to plain objects so the Client can consume them safely
  const initialBookings = JSON.parse(JSON.stringify(recentBookingsRaw));
  const initialRooms = JSON.parse(JSON.stringify(roomsRaw));
  const initialPromotions = JSON.parse(JSON.stringify(promotionsRaw));
  const initialTrend = JSON.parse(JSON.stringify(trendRaw));

  return (
    <AdminDashboardClient
      initialStats={{
        totalBookings,
        totalRevenue,
        activeCustomers,
        activeRooms,
      }}
      initialTrend={initialTrend}
      initialBookings={initialBookings}
      initialRooms={initialRooms}
      initialPromotions={initialPromotions}
    />
  );
}

