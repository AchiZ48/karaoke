import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { connectMongoDB } from "../../../lib/mongodb";
import Booking from "../../../models/booking";
import Room from "../../../models/room";
import Promotion from "../../../models/promotion";
import { expireStaleBookings } from "../../../lib/bookingCleanup";
import AdminDashboardClient from "../components/admin/AdminDashboardClient";
import { TIME_SLOTS, getCurrentTimeSlot } from "../../../lib/timeSlots";

const REVENUE_STATUSES = ["CONFIRMED", "PAID", "COMPLETED"];
const ACTIVE_ROOM_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "COMPLETED",
];

function normalizeRoomNumber(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user?.role !== "admin") redirect("/");

  await connectMongoDB();
  await expireStaleBookings();

  const totalBookings = await Booking.countDocuments({});

  const revenueAgg = await Booking.aggregate([
    { $match: { status: { $in: REVENUE_STATUSES } } },
    { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
  ]);
  const totalRevenue = revenueAgg[0]?.revenue ?? 0;

  const activeCustomers = (await Booking.distinct("customerEmail")).length;

  const now = new Date();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  trendStart.setHours(0, 0, 0, 0);

  const trendAgg = await Booking.aggregate([
    {
      $match: {
        status: { $in: REVENUE_STATUSES },
        date: { $gte: trendStart },
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

  const recentBookingsRaw = await Booking.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select(
      "bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt",
    )
    .lean();

  const currentSlot = getCurrentTimeSlot(now, TIME_SLOTS);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [roomsRaw, promotionsRaw, slotBookingsRaw] = await Promise.all([
    Room.find({}).sort({ createdAt: -1 }).lean(),
    Promotion.find({}).sort({ createdAt: -1 }).lean(),
    currentSlot
      ? Booking.find({
          date: { $gte: startOfDay, $lt: endOfDay },
          timeSlot: currentSlot,
          status: { $in: ACTIVE_ROOM_BOOKING_STATUSES },
        })
          .select(
            "bookingId customerName customerPhone room date timeSlot status paymentMethod totalAmount createdAt",
          )
          .lean()
      : Promise.resolve([]),
  ]);

  const slotBookingMap = new Map(
    slotBookingsRaw.map((booking) => [
      normalizeRoomNumber(booking?.room?.number),
      booking,
    ]),
  );

  const roomsWithLiveStatus = roomsRaw.map((room) => {
    const normalizedNumber = normalizeRoomNumber(room?.number);
    const activeBooking = normalizedNumber
      ? slotBookingMap.get(normalizedNumber)
      : undefined;
    const liveStatus =
      room.status === "MAINTENANCE"
        ? "MAINTENANCE"
        : activeBooking
        ? "OCCUPIED"
        : "AVAILABLE";

    return {
      ...room,
      liveStatus,
      activeBookingId: activeBooking?.bookingId ?? null,
      activeBookingTimeSlot: activeBooking?.timeSlot ?? null,
      activeBookingDate: activeBooking?.date ?? null,
    };
  });

  const availableRooms = roomsWithLiveStatus.filter(
    (room) => room.liveStatus === "AVAILABLE",
  ).length;

  const mergedBookings = [...recentBookingsRaw];
  for (const booking of slotBookingsRaw) {
    if (!mergedBookings.some((b) => b.bookingId === booking.bookingId)) {
      mergedBookings.push(booking);
    }
  }

  const initialBookings = JSON.parse(JSON.stringify(mergedBookings));
  const initialRooms = JSON.parse(JSON.stringify(roomsWithLiveStatus));
  const initialPromotions = JSON.parse(JSON.stringify(promotionsRaw));
  const initialTrend = JSON.parse(JSON.stringify(trendRaw));

  return (
    <AdminDashboardClient
      initialStats={{
        totalBookings,
        totalRevenue,
        activeCustomers,
        availableRooms,
      }}
      initialTrend={initialTrend}
      initialBookings={initialBookings}
      initialRooms={initialRooms}
      initialPromotions={initialPromotions}
    />
  );
}
