// components/admin/AdminDashboardClient.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import Navbar from "../Navbar";

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

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // เตรียม labels/data จาก trend
  const { labels, values } = useMemo(() => {
    return {
      labels: (initialTrend || []).map((t) => t.label),
      values: (initialTrend || []).map((t) => t.value),
    };
  }, [initialTrend]);

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
            data: values.map(v => Number(v) || 0),
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
    chart.data.datasets[0].data = values.map(v => Number(v) || 0);
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

  const showNotification = (msg) => alert(msg);

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
        <Navbar />
      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r border-white/10 p-4">
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
              <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                <StatCard icon="📅" value={initialStats?.totalBookings ?? 0} label="Total Bookings" change="+12.5%" changeType="positive" />
                <StatCard icon="💰" value={`฿${(initialStats?.totalRevenue ?? 0).toLocaleString()}`} label="Total Revenue" change="+23.1%" changeType="positive" />
                <StatCard icon="👥" value={initialStats?.activeCustomers ?? 0} label="Active Customers" change="+18.7%" changeType="positive" />
                <StatCard icon="🚪" value={`${initialStats?.availableRooms ?? 0}/${rooms.length}`} label="Available Rooms" change="-2" changeType="negative" />
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-white/10 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-medium">Revenue Trend</div>
                </div>
                {/* container ต้องมีความสูงคงที่ ป้องกัน reflow */}
                <div className="h-72">
                  <canvas ref={chartRef} className="w-full h-full" />
                </div>
              </div>

              {/* Recent bookings */}
              <AdminBookingsTable bookings={(bookings || []).slice(0, 5)} title="Recent Bookings" />
            </>
          )}

          {adminSection === "bookings" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">All Bookings Management</h1>
              <AdminBookingsTable
                bookings={bookings}
                title="All Bookings"
                showFilters={true}
                onStatusChange={(bookingId, newStatus) => {
                  setBookings((prev) =>
                    prev.map((b) => (b.bookingId === bookingId ? { ...b, status: newStatus } : b))
                  );
                  showNotification(`Booking ${bookingId} status updated to ${newStatus}`);
                  // TODO: fetch(`/api/admin/bookings/${bookingId}`, { method:'PATCH', body: JSON.stringify({status:newStatus}) })
                }}
                onDelete={(bookingId) => {
                  setBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
                  showNotification("Booking deleted successfully");
                  // TODO: fetch(`/api/admin/bookings/${bookingId}`, { method:'DELETE' })
                }}
              />
            </>
          )}

          {adminSection === "rooms" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Room Management</h1>
              <button className="mb-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2">
                ➕ Add New Room
              </button>
              <AdminRoomsTable
                rooms={rooms}
                onStatusChange={(roomId, newStatus) => {
                  setRooms((prev) =>
                    prev.map((r) => (String(r._id) === String(roomId) ? { ...r, status: newStatus } : r))
                  );
                  showNotification(`Room status updated to ${newStatus}`);
                }}
                onEdit={() => showNotification("Open edit room modal")}
                onDelete={(roomId) => {
                  setRooms((prev) => prev.filter((r) => String(r._id) !== String(roomId)));
                  showNotification("Room deleted successfully");
                }}
              />
            </>
          )}

          {adminSection === "promotions" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Promotion Management</h1>
              <button className="mb-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2">
                ➕ Create New Promotion
              </button>
              <AdminPromotionsManager
                promotions={promotions}
                onToggleStatus={(promoId) => {
                  setPromotions((prev) =>
                    prev.map((p) => (String(p._id) === String(promoId) ? { ...p, isActive: !p.isActive } : p))
                  );
                  showNotification("Promotion status updated");
                }}
                onEdit={() => showNotification("Open promotion edit")}
                onDelete={(promoId) => {
                  setPromotions((prev) => prev.filter((p) => String(p._id) !== String(promoId)));
                  showNotification("Promotion deleted");
                }}
              />
            </>
          )}

          {adminSection === "customers" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Customer Management</h1>
              <AdminCustomersTable />
            </>
          )}

          {adminSection === "reports" && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Reports & Analytics</h1>
              <AdminReports />
            </>
          )}
        </main>
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
            changeType === "positive" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
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
    REFUNDED: "bg-slate-500/15 text-slate-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${map[status] || "bg-white/10 text-white/70"}`}>
      {status}
    </span>
  );
}

function AdminBookingsTable({ bookings = [], title = "Bookings", showFilters=false, onStatusChange, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-base font-medium">{title}</div>
        {showFilters && <div className="text-sm text-white/60">Filters TODO</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {["Booking ID","Customer","Room","Date & Time","Status","Payment","Amount","Actions"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-white/80">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.bookingId} className="border-t border-white/10">
                <td className="px-4 py-2">{b.bookingId}</td>
                <td className="px-4 py-2">
                  <div>{b.customerName}</div>
                  <div className="text-xs text-white/60">{b.customerPhone}</div>
                </td>
                <td className="px-4 py-2">{b.room?.name || b.room?.number || "-"}</td>
                <td className="px-4 py-2">
                  <div>{b.date ? new Date(b.date).toISOString().slice(0,10) : "-"}</div>
                  <div className="text-xs text-white/60">{b.timeSlot}</div>
                </td>
                <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-2">{b.paymentMethod || "-"}</td>
                <td className="px-4 py-2">฿{(b.totalAmount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {onStatusChange && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onStatusChange(b.bookingId, "CONFIRMED")}
                        title="Set Confirmed"
                      >
                        ✅
                      </button>
                    )}
                    {onDelete && (
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
                <td colSpan={8} className="px-4 py-6 text-center text-white/60">No data</td>
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
      <div className="px-4 py-3 border-b border-white/10 text-base font-medium">Rooms</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {["Name","Number","Type","Capacity","Price","Status","Actions"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-white/80">{h}</th>
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
                <td className="px-4 py-2">฿{(r.price ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {onStatusChange && (
                      <button
                        className="rounded-lg px-2 py-1 bg-white/10 hover:bg-white/15"
                        onClick={() => onStatusChange(r._id, r.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE")}
                      >
                        🔄
                      </button>
                    )}
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
                <td colSpan={7} className="px-4 py-6 text-center text-white/60">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPromotionsManager({ promotions = [], onToggleStatus, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-base font-medium">Promotions</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {["Code","Name","Type","Value","Active","Actions"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-white/80">{h}</th>
              ))}
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
                <td className="px-4 py-2">{p.isActive ? "Yes" : "No"}</td>
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
                <td colSpan={6} className="px-4 py-6 text-center text-white/60">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCustomersTable() {
  return <div className="rounded-2xl border border-white/10 p-4 text-white/80">TODO: customers</div>;
}
function AdminReports() {
  return <div className="rounded-2xl border border-white/10 p-4 text-white/80">TODO: reports</div>;
}
