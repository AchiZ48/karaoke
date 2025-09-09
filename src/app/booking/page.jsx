"use client";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

const timeSlots = [
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export default function BookingPage() {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    roomNumber: "",
    date: "",
    timeSlot: timeSlots[0],
    numberOfPeople: 1,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    paymentMethod: "CASH",
  });

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.number === form.roomNumber),
    [rooms, form.roomNumber]
  );

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoadingRooms(true);
        const res = await fetch("/api/rooms");
        const data = await res.json();
        setRooms(data.rooms || []);
        if ((data.rooms || []).length) {
          setForm((f) => ({ ...f, roomNumber: data.rooms[0].number }));
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load rooms");
      } finally {
        setLoadingRooms(false);
      }
    }
    loadRooms();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create booking");
      }
      setSuccess(`Booking created: ${data.booking.bookingId}`);
      // Optionally reset some fields
      setForm((f) => ({ ...f, date: "", timeSlot: timeSlots[0], numberOfPeople: 1 }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <Navbar />

      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Book a Room</h1>

        {error && (
          <div className="bg-red-500 text-white px-3 py-2 rounded mb-3">{error}</div>
        )}
        {success && (
          <div className="bg-green-600 text-white px-3 py-2 rounded mb-3">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Room</label>
            {loadingRooms ? (
              <div className="opacity-70">Loading rooms…</div>
            ) : (
              <select
                className="w-full border rounded p-2 bg-white text-black"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              >
                {rooms.map((r) => (
                  <option key={r.number} value={r.number}>
                    {r.name} ({r.type}) — {r.capacity} ppl — {r.price} THB
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Date</label>
              <input
                type="date"
                className="w-full border rounded p-2 bg-white text-black"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Time Slot</label>
              <select
                className="w-full border rounded p-2 bg-white text-black"
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1">Number of People</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded p-2 bg-white text-black"
              value={form.numberOfPeople}
              onChange={(e) => setForm({ ...form, numberOfPeople: Number(e.target.value) })}
              required
            />
            {selectedRoom && (
              <p className="text-sm opacity-70 mt-1">
                Capacity: {selectedRoom.capacity} — Price: {selectedRoom.price} THB
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Your Name</label>
              <input
                type="text"
                className="w-full border rounded p-2 bg-white text-black"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Phone</label>
              <input
                type="tel"
                className="w-full border rounded p-2 bg-white text-black"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded p-2 bg-white text-black"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-1">Payment Method</label>
            <select
              className="w-full border rounded p-2 bg-white text-black"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="PROMPTPAY">PromptPay</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </div>

          <div className="pt-2">
            <button type="submit" className="bg-black text-white px-4 py-2 rounded">
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

