// components/admin/AdminDashboardClient.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
// Navbar is provided by layout
import { useToast } from "../toast/ToastProvider";

// Format Thai Baht consistently
const formatBaht = (amount) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));

export default function AdminDashboardClient({
  initialStats,
  initialTrend,
  initialBookings,
  initialRooms,
  initialPromotions,
}) {
  const [adminSection, setAdminSection] = useState("dashboard");
  const [bookings, setBookings] = useState(initialBookings || []);
  const [rooms, setRooms] = useState(initialRooms || []);
  const [promotions, setPromotions] = useState(initialPromotions || []);
  const [stats, setStats] = useState(initialStats || {});
  const [trend, setTrend] = useState(initialTrend || []);
  const [trendScale, setTrendScale] = useState("month");
  const [trendLoading, setTrendLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomDraft, setRoomDraft] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoDraft, setPromoDraft] = useState(null);
  const [customers, setCustomers] = useState([]);
  // Filters
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatus, setRoomStatus] = useState("");
  const [promoSearch, setPromoSearch] = useState("");
  const [promoActive, setPromoActive] = useState("");
  // Toast notifications
  const { showToast } = useToast();

  // Modals state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null); // { bookingId, date, timeSlot }
  const [availableSlots, setAvailableSlots] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const timeSlots = [
    "12:00-14:00",
    "14:00-16:00",
    "16:00-18:00",
    "18:00-20:00",
    "20:00-22:00",
  ];

  const loadDashboard = useCallback(
    async ({ scale = trendScale, updateAll = false } = {}) => {
      const params = new URLSearchParams({ scale });
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load dashboard");
      }
      if (updateAll) {
        setStats(data.stats || {});
        if (Array.isArray(data.recentBookings))
          setBookings(data.recentBookings);
        if (Array.isArray(data.rooms)) setRooms(data.rooms);
        if (Array.isArray(data.promotions)) setPromotions(data.promotions);
      }
      setTrend(data.trend || []);
      return data;
    },
    [trendScale],
  );

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const initialTrendScaleLoad = useRef(true);

  // เตรียม labels/data จาก trend
  const { labels, values } = useMemo(() => {
    return {
      labels: (trend || []).map((t) => t.label),
      values: (trend || []).map((t) => t.value),
    };
  }, [trend]);

  useEffect(() => {
    if (initialTrendScaleLoad.current && trendScale === "month") {
      initialTrendScaleLoad.current = false;
      return;
    }
    initialTrendScaleLoad.current = false;
    let ignore = false;
    const run = async () => {
      setTrendLoading(true);
      try {
        await loadDashboard({ scale: trendScale, updateAll: false });
      } catch (e) {
        if (!ignore) showToast(e.message, "error");
      } finally {
        if (!ignore) setTrendLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [trendScale, loadDashboard, showToast]);

  // ✅ แก้บั๊ก Chart re-init: สร้างครั้งเดียว แล้วอัปเดตข้อมูลแทน
  useEffect(() => {
    // ถ้าไม่ได้อยู่หน้า dashboard → ทำลาย chart (ถ้ามี) แล้วจบ
    if (adminSection !== "dashboard") {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      return;
    }
    if (!chartRef.current) return;

    // สร้างใหม่เมื่อเข้าหน้า dashboard
    if (!chartInstance.current) {
      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Revenue (THB)",
              data: values.map((v) => Number(v) || 0),
              borderColor: "#8B5CF6",
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    } else {
      // อัปเดตข้อมูลถ้ามี chart อยู่แล้ว
      const chart = chartInstance.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = values.map((v) => Number(v) || 0);
      chart.update();
    }

    // cleanup เฉพาะตอน component ถูกถอดจริง ๆ
    return () => {
      if (chartInstance.current && adminSection === "dashboard") {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [adminSection, labels, values]);

  const showNotification = (msg, type = "success") => showToast(msg, type);

  // Derived filtered lists
  const filteredBookings = useMemo(() => {
    let list = bookings || [];
    if (bookingSearch) {
      const q = bookingSearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.bookingId?.toLowerCase().includes(q) ||
          b.customerName?.toLowerCase().includes(q) ||
          b.customerEmail?.toLowerCase().includes(q) ||
          b.room?.name?.toLowerCase().includes(q) ||
          b.room?.number?.toLowerCase().includes(q),
      );
    }
    if (bookingStatus) list = list.filter((b) => b.status === bookingStatus);
    return list;
  }, [bookings, bookingSearch, bookingStatus]);

  const filteredRooms = useMemo(() => {
    let list = rooms || [];
    if (roomSearch) {
      const q = roomSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.number?.toLowerCase().includes(q) ||
          r.type?.toLowerCase().includes(q),
      );
    }
    if (roomStatus) list = list.filter((r) => r.status === roomStatus);
    return list;
  }, [rooms, roomSearch, roomStatus]);

  const filteredPromotions = useMemo(() => {
    let list = promotions || [];
    if (promoSearch) {
      const q = promoSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q),
      );
    }
    if (promoActive === "1") list = list.filter((p) => !!p.isActive);
    if (promoActive === "0") list = list.filter((p) => !p.isActive);
    return list;
  }, [promotions, promoSearch, promoActive]);

  // Load availability when editing booking (date change)
  useEffect(() => {
    async function loadAvail() {
      if (!showBookingModal || !bookingDraft) return;
      // Find room number from the current booking record
      const b = bookings.find((x) => x.bookingId === bookingDraft.bookingId);
      if (!b || !bookingDraft.date) return;
      try {
        const params = new URLSearchParams({
          roomNumber: b.room?.number,
          date: bookingDraft.date,
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableSlots(data.available || timeSlots);
          setOccupiedSlots(data.occupied || []);
          if (!data.available?.includes(bookingDraft.timeSlot)) {
            setBookingDraft((d) => ({
              ...d,
              timeSlot: (data.available || [timeSlots[0]])[0],
            }));
          }
        }
      } catch {}
    }
    loadAvail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBookingModal, bookingDraft?.date]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white py-20">
      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r border-neutral-200 dark:border-white/10 p-4">
          <div className="text-lg font-semibold mb-4">Admin Panel</div>
          <nav className="space-y-1">
            {[
              { key: "dashboard", icon: "📊", label: "Dashboard" },
              { key: "bookings", icon: "📅", label: "All Bookings" },
              { key: "rooms", icon: "🚪", label: "Room Management" },
              { key: "promotions", icon: "🎁", label: "Promotions" },
              { key: "customers", icon: "👥", label: "Customers" },
              { key: "reports", icon: "📈", label: "Reports" },
            ].map((it) => (
              <button
                key={it.key}
                onClick={() => setAdminSection(it.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition
                  ${adminSection === it.key ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10 p-4 md:p-6">
          {adminSection === "dashboard" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
                <button
                  onClick={async () => {
                    try {
                      setRefreshing(true);
                      await loadDashboard({
                        scale: trendScale,
                        updateAll: true,
                      });
                      showToast("Dashboard refreshed");
                    } catch (e) {
                      showToast(e.message, "error");
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-4 py-2"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                <StatCard
                  icon="📅"
                  value={stats?.totalBookings ?? 0}
                  label="Total Bookings"
                  changeType="positive"
                />
                <StatCard
                  icon="💰"
                  value={formatBaht(stats?.totalRevenue ?? 0)}
                  label="Total Revenue"
                  changeType="positive"
                />
                <StatCard
                  icon="👥"
                  value={stats?.activeCustomers ?? 0}
                  label="Total Customers"
                  changeType="positive"
                />
                <StatCard
                  icon="🚪"
                  value={`${stats?.availableRooms ?? 0}/${rooms.length}`}
                  label="Available Rooms"
                  changeType="negative"
                />
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-white/10 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-medium">Revenue Trend</div>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    {trendLoading && <span>Loading...</span>}
                    <select
                      value={trendScale}
                      onChange={(e) => setTrendScale(e.target.value)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <option value="month">Monthly (last 6 months)</option>
                      <option value="day">Daily (last 30 days)</option>
                    </select>
                  </div>
                </div>
                {/* container ต้องมีความสูงคงที่ ป้องกัน reflow */}
                <div className="h-72">
                  <canvas ref={chartRef} className="w-full h-full" />
                </div>
              </div>

              {/* Recent bookings */}
              <AdminBookingsTable
                bookings={(bookings || []).slice(0, 5)}
                title="Recent Bookings"
                onEditBooking={(b) => {
                  setBookingDraft({
                    bookingId: b.bookingId,
                    date: b.date
                      ? new Date(b.date).toISOString().slice(0, 10)
                      : "",
                    timeSlot: b.timeSlot,
                  });
                  setShowBookingModal(true);
                }}
              />
            </>
          )}

          {adminSection === "bookings" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                All Bookings Management
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search booking/customer/room"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  <option value="">All Status</option>
                  {[
                    "PENDING",
                    "CONFIRMED",
                    "PAID",
                    "COMPLETED",
                    "CANCELLED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <AdminBookingsTable
                bookings={filteredBookings}
                title="All Bookings"
                showFilters={false}
                onEditBooking={(b) => {
                  setBookingDraft({
                    bookingId: b.bookingId,
                    date: b.date
                      ? new Date(b.date).toISOString().slice(0, 10)
                      : "",
                    timeSlot: b.timeSlot,
                  });
                  setShowBookingModal(true);
                }}
                onStatusChange={async (bookingId, newStatus) => {
                  try {
                    const res = await fetch(`/api/bookings/${bookingId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setBookings((prev) =>
                      prev.map((b) =>
                        b.bookingId === bookingId
                          ? { ...b, status: newStatus }
                          : b,
                      ),
                    );
                    showNotification(`Updated ${bookingId} → ${newStatus}`);
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
              />
            </>
          )}

          {adminSection === "rooms" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Room Management</h1>
              <form
                className="hidden"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const payload = {
                    name: form.name.value,
                    number: form.number.value,
                    type: form.type.value,
                    capacity: Number(form.capacity.value),
                    price: Number(form.price.value),
                    status: form.status.value,
                  };
                  try {
                    const res = await fetch("/api/rooms", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setRooms((prev) => [data.room, ...prev]);
                    form.reset();
                    showNotification("Room created");
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
              >
                <input
                  name="name"
                  placeholder="Name"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <input
                  name="number"
                  placeholder="Number"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  name="type"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  {["STANDARD", "PREMIUM", "DELUXE", "VIP"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="Capacity"
                  required
                  className="w-28 px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <input
                  name="price"
                  type="number"
                  min="0"
                  placeholder="Price"
                  required
                  className="w-28 px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  name="status"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  {["AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2">
                  Add New Room
                </button>
              </form>
              <button
                className="mb-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2"
                onClick={() => {
                  setRoomDraft({
                    name: "",
                    number: "",
                    type: "STANDARD",
                    capacity: 1,
                    price: 0,
                    status: "AVAILABLE",
                  });
                  setShowRoomModal(true);
                }}
              >
                ➕ Add New Room
              </button>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search rooms"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  value={roomStatus}
                  onChange={(e) => setRoomStatus(e.target.value)}
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  <option value="">All Status</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
              <AdminRoomsTable
                rooms={filteredRooms}
                onStatusChange={async (roomId, newStatus) => {
                  try {
                    const res = await fetch("/api/rooms", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: roomId, status: newStatus }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setRooms((prev) =>
                      prev.map((r) =>
                        String(r._id) === String(roomId)
                          ? { ...r, status: newStatus }
                          : r,
                      ),
                    );
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
                onEdit={(room) => {
                  setRoomDraft({ ...room });
                  setShowRoomModal(true);
                }}
                onDelete={async (roomId) => {
                  if (!confirm("Delete room?")) return;
                  try {
                    const res = await fetch(`/api/rooms?id=${roomId}`, {
                      method: "DELETE",
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setRooms((prev) =>
                      prev.filter((r) => String(r._id) !== String(roomId)),
                    );
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
              />
            </>
          )}

          {adminSection === "promotions" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Promotion Management
              </h1>
              <button
                className="mb-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2"
                onClick={() => {
                  setPromoDraft({
                    code: "",
                    name: "",
                    discountType: "PERCENT",
                    discountValue: 0,
                    startDate: "",
                    endDate: "",
                    isActive: true,
                  });
                  setShowPromoModal(true);
                }}
              >
                Create New Promotion
              </button>
              <form
                className="hidden"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = e.target;
                  const payload = {
                    code: f.code.value,
                    name: f.name.value,
                    discountType: f.discountType.value,
                    discountValue: Number(f.discountValue.value),
                    startDate: new Date(f.startDate.value),
                    endDate: new Date(f.endDate.value),
                    isActive: f.isActive.checked,
                  };
                  try {
                    const res = await fetch("/api/promotions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setPromotions((prev) => [data.promotion, ...prev]);
                    f.reset();
                    showNotification("Promotion created");
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
              >
                <input
                  name="code"
                  placeholder="Code"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <input
                  name="name"
                  placeholder="Name"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  name="discountType"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  {["PERCENT", "FIXED"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  name="discountValue"
                  type="number"
                  min="0"
                  placeholder="Value"
                  required
                  className="w-24 px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <input
                  name="startDate"
                  type="date"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <input
                  name="endDate"
                  type="date"
                  required
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <label className="flex items-center gap-1 text-sm">
                  <input name="isActive" type="checkbox" defaultChecked />{" "}
                  Active
                </label>
                <button className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2">
                  Create New Promotion
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  placeholder="Search promotions"
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                />
                <select
                  value={promoActive}
                  onChange={(e) => setPromoActive(e.target.value)}
                  className="px-2 py-1 rounded bg-white/10 border border-white/10"
                >
                  <option value="">All</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
              <AdminPromotionsManager
                promotions={filteredPromotions}
                onToggleStatus={async (promoId) => {
                  const target = promotions.find(
                    (p) => String(p._id) === String(promoId),
                  );
                  if (!target) return;
                  try {
                    const res = await fetch("/api/promotions", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: promoId,
                        isActive: !target.isActive,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setPromotions((prev) =>
                      prev.map((p) =>
                        String(p._id) === String(promoId)
                          ? { ...p, isActive: !p.isActive }
                          : p,
                      ),
                    );
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
                onEdit={(promo) => {
                  setPromoDraft({ ...promo });
                  setShowPromoModal(true);
                }}
                onDelete={async (promoId) => {
                  if (!confirm("Delete promotion?")) return;
                  try {
                    const res = await fetch(`/api/promotions?id=${promoId}`, {
                      method: "DELETE",
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message || "Failed");
                    setPromotions((prev) =>
                      prev.filter((p) => String(p._id) !== String(promoId)),
                    );
                  } catch (e) {
                    showNotification(e.message);
                  }
                }}
              />
            </>
          )}

          {adminSection === "customers" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Customer Management
              </h1>
              <AdminCustomersTable
                customers={customers}
                onLoad={async () => {
                  try {
                    const res = await fetch("/api/customers");
                    const data = await res.json();
                    if (res.ok) setCustomers(data.users || []);
                  } catch {}
                }}
              />
            </>
          )}

          {adminSection === "reports" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Reports & Analytics
              </h1>
              <AdminReports trend={trend || []} stats={stats || {}} />
            </>
          )}
        </main>
      </div>
      {/* toasts handled globally */}

      {/* Booking edit modal */}
      <Modal open={showBookingModal} onClose={() => setShowBookingModal(false)}>
        <div className="text-lg font-semibold mb-3">Edit Booking</div>
        {bookingDraft && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(
                  `/api/bookings/${bookingDraft.bookingId}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      date: bookingDraft.date,
                      timeSlot: bookingDraft.timeSlot,
                    }),
                  },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message || "Failed");
                setBookings((prev) =>
                  prev.map((b) =>
                    b.bookingId === bookingDraft.bookingId
                      ? {
                          ...b,
                          date: bookingDraft.date,
                          timeSlot: bookingDraft.timeSlot,
                        }
                      : b,
                  ),
                );
                setShowBookingModal(false);
                showNotification("Booking updated", "success");
              } catch (e) {
                showNotification(e.message, "error");
              }
            }}
          >
            <div>
              <label className="block mb-1">Date</label>
              <input
                type="date"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                value={bookingDraft.date}
                onChange={(e) =>
                  setBookingDraft((d) => ({ ...d, date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="block mb-1">Time Slot</label>
              <select
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                value={bookingDraft.timeSlot}
                onChange={(e) =>
                  setBookingDraft((d) => ({ ...d, timeSlot: e.target.value }))
                }
              >
                {timeSlots.map((t) => (
                  <option
                    key={t}
                    value={t}
                    disabled={
                      availableSlots.length > 0 && !availableSlots.includes(t)
                    }
                  >
                    {t}
                    {occupiedSlots.includes(t) ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1 rounded bg-white/10"
                onClick={() => setShowBookingModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* Room create/edit modal */}
      <Modal open={showRoomModal} onClose={() => setShowRoomModal(false)}>
        <div className="text-lg font-semibold mb-3">
          {roomDraft?._id ? "Edit Room" : "Add Room"}
        </div>
        {roomDraft && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = { ...roomDraft };
                if (roomDraft._id) {
                  const res = await fetch("/api/rooms", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: roomDraft._id,
                      name: payload.name,
                      number: payload.number,
                      type: payload.type,
                      capacity: Number(payload.capacity),
                      price: Number(payload.price),
                      status: payload.status,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.message || "Failed");
                  setRooms((prev) =>
                    prev.map((r) =>
                      String(r._id) === String(roomDraft._id)
                        ? { ...r, ...payload }
                        : r,
                    ),
                  );
                } else {
                  const res = await fetch("/api/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: payload.name,
                      number: payload.number,
                      type: payload.type,
                      capacity: Number(payload.capacity),
                      price: Number(payload.price),
                      status: payload.status,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.message || "Failed");
                  setRooms((prev) => [data.room, ...prev]);
                }
                setShowRoomModal(false);
              } catch (e) {
                showNotification(e.message);
              }
            }}
          >
            <input
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              placeholder="Name"
              value={roomDraft.name}
              onChange={(e) =>
                setRoomDraft((d) => ({ ...d, name: e.target.value }))
              }
              required
            />
            <input
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              placeholder="Number"
              value={roomDraft.number}
              onChange={(e) =>
                setRoomDraft((d) => ({ ...d, number: e.target.value }))
              }
              required
            />
            <select
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              value={roomDraft.type}
              onChange={(e) =>
                setRoomDraft((d) => ({ ...d, type: e.target.value }))
              }
            >
              {["STANDARD", "PREMIUM", "DELUXE", "VIP"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                placeholder="Capacity"
                value={roomDraft.capacity}
                onChange={(e) =>
                  setRoomDraft((d) => ({
                    ...d,
                    capacity: Number(e.target.value),
                  }))
                }
                required
              />
              <input
                type="number"
                min="0"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                placeholder="Price"
                value={roomDraft.price}
                onChange={(e) =>
                  setRoomDraft((d) => ({ ...d, price: Number(e.target.value) }))
                }
                required
              />
            </div>
            <select
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              value={roomDraft.status}
              onChange={(e) =>
                setRoomDraft((d) => ({ ...d, status: e.target.value }))
              }
            >
              {["AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1 rounded bg-white/10"
                onClick={() => setShowRoomModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Promotion create/edit modal */}
      <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)}>
        <div className="text-lg font-semibold mb-3">
          {promoDraft?._id ? "Edit Promotion" : "Create Promotion"}
        </div>
        {promoDraft && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = { ...promoDraft };
                if (promoDraft._id) {
                  const res = await fetch("/api/promotions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: promoDraft._id,
                      code: payload.code,
                      name: payload.name,
                      discountType: payload.discountType,
                      discountValue: Number(payload.discountValue),
                      startDate: payload.startDate,
                      endDate: payload.endDate,
                      isActive: !!payload.isActive,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.message || "Failed");
                  setPromotions((prev) =>
                    prev.map((p) =>
                      String(p._id) === String(promoDraft._id)
                        ? { ...p, ...payload }
                        : p,
                    ),
                  );
                } else {
                  const res = await fetch("/api/promotions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: payload.code,
                      name: payload.name,
                      discountType: payload.discountType,
                      discountValue: Number(payload.discountValue),
                      startDate: new Date(payload.startDate),
                      endDate: new Date(payload.endDate),
                      isActive: !!payload.isActive,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.message || "Failed");
                  setPromotions((prev) => [data.promotion, ...prev]);
                }
                setShowPromoModal(false);
              } catch (e) {
                showNotification(e.message);
              }
            }}
          >
            <input
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              placeholder="Code"
              value={promoDraft.code}
              onChange={(e) =>
                setPromoDraft((d) => ({ ...d, code: e.target.value }))
              }
              required={!promoDraft._id}
            />
            <input
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
              placeholder="Name"
              value={promoDraft.name}
              onChange={(e) =>
                setPromoDraft((d) => ({ ...d, name: e.target.value }))
              }
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                value={promoDraft.discountType}
                onChange={(e) =>
                  setPromoDraft((d) => ({ ...d, discountType: e.target.value }))
                }
              >
                {["PERCENT", "FIXED"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                placeholder="Value"
                value={promoDraft.discountValue}
                onChange={(e) =>
                  setPromoDraft((d) => ({
                    ...d,
                    discountValue: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                value={
                  promoDraft.startDate
                    ? String(promoDraft.startDate).slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setPromoDraft((d) => ({ ...d, startDate: e.target.value }))
                }
                required
              />
              <input
                type="date"
                className="w-full bg-white/10 border border-white/10 rounded px-2 py-1"
                value={
                  promoDraft.endDate
                    ? String(promoDraft.endDate).slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setPromoDraft((d) => ({ ...d, endDate: e.target.value }))
                }
                required
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!promoDraft.isActive}
                onChange={(e) =>
                  setPromoDraft((d) => ({ ...d, isActive: e.target.checked }))
                }
              />{" "}
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1 rounded bg-white/10"
                onClick={() => setShowPromoModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-neutral-900 text-white border border-white/10 rounded-2xl p-4 w-full max-w-lg shadow-xl">
        {children}
      </div>
    </div>
  );
}

/* ====== Components (Tailwind) ====== */

function StatCard({ icon, value, label, change, changeType }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-white/70 text-sm">{label}</div>
        </div>
      </div>
      {change && (
        <div
          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs ${
            changeType === "positive"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {change}
        </div>
      )}
    </div>
  );
}

function QuickAction({ onClick, icon, text }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 hover:bg-white/5 transition"
    >
      <div className="text-xl">{icon}</div>
      <div className="text-sm">{text}</div>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    CONFIRMED: "bg-emerald-500/15 text-emerald-300",
    PENDING: "bg-amber-500/15 text-amber-300",
    PAID: "bg-sky-500/15 text-sky-300",
    COMPLETED: "bg-violet-500/15 text-violet-300",
    CANCELLED: "bg-rose-500/15 text-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${map[status] || "bg-white/10 text-white/70"}`}
    >
      {status}
    </span>
  );
}

function AdminBookingsTable({
  bookings = [],
  title = "Bookings",
  showFilters = false,
  onStatusChange,
  onDelete,
  onEditBooking,
}) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-base font-medium">{title}</div>
        {showFilters && (
          <div className="text-sm text-white/60">Filters TODO</div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-white/5">
            <tr>
              {[
                "Booking ID",
                "Customer",
                "Room",
                "Date & Time",
                "Status",
                "Payment",
                "Amount",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left font-medium text-neutral-700 dark:text-white/80"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr
                key={b.bookingId}
                className="border-t border-neutral-200 dark:border-white/10"
              >
                <td className="px-4 py-2">{b.bookingId}</td>
                <td className="px-4 py-2">
                  <div>{b.customerName}</div>
                  <div className="text-xs text-neutral-500 dark:text-white/60">
                    {b.customerPhone}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {b.room?.name || b.room?.number || "-"}
                </td>
                <td className="px-4 py-2">
                  <div>
                    {b.date ? new Date(b.date).toISOString().slice(0, 10) : "-"}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-white/60">
                    {b.timeSlot}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-2">{b.paymentMethod || "-"}</td>
                <td className="px-4 py-2">
                  ฿{(b.totalAmount ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="underline"
                      onClick={() => onEditBooking && onEditBooking(b)}
                    >
                      Edit
                    </button>
                    {onStatusChange && (
                      <select
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        value={b.status}
                        onChange={(e) =>
                          onStatusChange(b.bookingId, e.target.value)
                        }
                        title="Change status"
                      >
                        {[
                          "PENDING",
                          "CONFIRMED",
                          "PAID",
                          "COMPLETED",
                          "CANCELLED",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}

                    {false && (
                      <select
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        value={b.status}
                        onChange={(e) =>
                          onStatusChange(b.bookingId, e.target.value)
                        }
                        title="Change status"
                      >
                        {["PENDING", "PAID", "COMPLETED", "CANCELLED"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ),
                        )}
                      </select>
                    )}
                    {onStatusChange && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onStatusChange(b.bookingId, "COMPLETED")}
                        title="End Booking"
                      >
                        ✅
                      </button>
                    )}
                    {false && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onDelete(b.bookingId)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-white/60">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminRoomsTable({ rooms = [], onStatusChange, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-base font-medium">
        Rooms
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {[
                "Name",
                "Number",
                "Type",
                "Capacity",
                "Price",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left font-medium text-white/80"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r._id} className="border-t border-white/10">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.number}</td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.capacity}</td>
                <td className="px-4 py-2">
                  ฿{(r.price ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    
                    {onEdit && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onEdit(r)}
                      >
                        ✏️
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onDelete(r._id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/60">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPromotionsManager({
  promotions = [],
  onToggleStatus,
  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-base font-medium">
        Promotions
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {["Code", "Name", "Type", "Value", "Active", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium text-white/80"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p._id} className="border-t border-white/10">
                <td className="px-4 py-2">{p.code}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.discountType}</td>
                <td className="px-4 py-2">
                  {p.discountType === "PERCENT"
                    ? `${p.discountValue}%`
                    : `฿${(p.discountValue ?? 0).toLocaleString()}`}
                </td>
                <td className="px-4 py-2">{p.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {onToggleStatus && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onToggleStatus(p._id)}
                      >
                        🔁
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onEdit(p)}
                      >
                        ✏️
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onDelete(p._id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/60">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCustomersTable({ customers = [], onLoad }) {
  useEffect(() => {
    onLoad && onLoad();
  }, []);
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-base font-medium">
        Customers
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {["Name", "Email", "Phone", "Joined"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left font-medium text-white/80"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.email} className="border-t border-white/10">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.email}</td>
                <td className="px-4 py-2">{c.phone}</td>
                <td className="px-4 py-2">
                  {c.createdAt
                    ? new Date(c.createdAt).toISOString().slice(0, 10)
                    : "-"}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/60">
                  No customers
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ...existing code...
function AdminReports({ trend = [], stats = {} }) {
  // เพิ่มฟังก์ชัน export CSV
  const handleExportCSV = () => {
    if (!trend || trend.length === 0) return;
    const header = ["Month", "Revenue (THB)"];
    const rows = trend.map(t => [t.label, t.value ?? 0]);
    let csvContent =
      header.join(",") +
      "\n" +
      rows.map(row => row.map(String).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monthly_revenue_report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 p-4">
        <div className="text-base font-medium mb-2">Summary</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 p-3">
            Total Bookings: {stats?.totalBookings ?? 0}
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            Revenue: ฿{(stats?.totalRevenue ?? 0).toLocaleString()}
          </div>
          <div className="rounded-xl border border-white/10 p-3">
            Active Customers: {stats?.activeCustomers ?? 0}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden mt-2">
        <div className="px-4 py-3 border-b border-white/10 text-base font-medium">
          Monthly Revenue
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-white/80">
                  Month
                </th>
                <th className="px-4 py-2 text-left font-medium text-white/80">
                  Revenue (THB)
                </th>
              </tr>
            </thead>
            <tbody>
              {trend.map((t) => (
                <tr key={t.label} className="border-t border-white/10">
                  <td className="px-4 py-2">{t.label}</td>
                  <td className="px-4 py-2">
                    {(t.value ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {trend.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-6 text-center text-white/60"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ปุ่ม export อยู่ข้างล่างและอยู่นอกตาราง Monthly Revenue */}
      <div className="flex justify-start mt-8">
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-white text-lg font-semibold shadow"
        >
          export report
        </button>
      </div>
    </div>
  );
}
// ...existing code...