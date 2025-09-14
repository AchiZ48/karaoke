"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import Navbar from "../components/Navbar";

const timeSlots = [
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export default function BookingPage() {
  const { data: session } = useSession();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [promotions, setPromotions] = useState([]);
  const [availableSlots, setAvailableSlots] = useState(timeSlots);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const [currentBookingId, setCurrentBookingId] = useState("");
  const [waitingPayment, setWaitingPayment] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    date: "",
    timeSlot: timeSlots[0],
    numberOfPeople: 1,
    // name/email/phone derived from session on server
    paymentMethod: "CASH",
    promotionCode: "",
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

  const [authRequiredMsg, setAuthRequiredMsg] = useState("");
  useEffect(() => {
    if (!session) {
      setAuthRequiredMsg("Please login to book a room.");
    } else {
      setAuthRequiredMsg("");
    }
  }, [session]);

  useEffect(() => {
    async function loadPromos() {
      try {
        const res = await fetch("/api/promotions?active=1");
        const data = await res.json();
        setPromotions(data.promotions || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadPromos();
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      setAvailableSlots(timeSlots);
      setOccupiedSlots([]);
      if (!form.roomNumber || !form.date) return;
      try {
        const params = new URLSearchParams({ roomNumber: form.roomNumber, date: form.date });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableSlots(data.available || timeSlots);
          setOccupiedSlots(data.occupied || []);
          if (!data.available?.includes(form.timeSlot)) {
            setForm((f) => ({ ...f, timeSlot: (data.available || [timeSlots[0]])[0] }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadAvailability();
  }, [form.roomNumber, form.date]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0,10), []);

  const priceAfterPromo = useMemo(() => {
    const r = rooms.find((x) => x.number === form.roomNumber);
    if (!r) return 0;
    const base = r.price || 0;
    const promo = promotions.find((p) => p.code === form.promotionCode);
    if (!promo) return base;
    if (promo.discountType === "PERCENT") {
      return Math.max(0, Math.round(base * (1 - promo.discountValue / 100)));
    }
    if (promo.discountType === "FIXED") {
      return Math.max(0, base - promo.discountValue);
    }
    return base;
  }, [rooms, form.roomNumber, form.promotionCode, promotions]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setQrData(null);
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
      const booking = data.booking;
      setCurrentBookingId(booking.bookingId);
      if (form.paymentMethod === "CASH") {
        setSuccess(`Booking created: ${booking.bookingId}`);
        // redirect to my bookings
        window.location.href = "/my-bookings";
        return;
      }
      if (form.paymentMethod === "PROMPTPAY") {
        // initiate Stripe PromptPay
        const payRes = await fetch("/api/payments/promptpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData?.message || "Payment init failed");

        const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!pubKey) throw new Error("Missing Stripe publishable key");
        const stripe = await loadStripe(pubKey);
        const result = await stripe.confirmPromptPayPayment(payData.clientSecret, {
          payment_method: {
            billing_details: {
              name: session?.user?.name || (session?.user?.email?.split('@')[0] ?? 'User'),
              email: session?.user?.email,
            },
          },
        });
        if (result.error) {
          throw new Error(result.error.message || "Stripe confirm failed");
        }
        const next = result.paymentIntent?.next_action?.promptpay_display_qr_code;
        const image = next?.image_url_png || next?.image_data_url;
        if (image) {
          const expires = result.paymentIntent.next_action?.expires_at
            ? result.paymentIntent.next_action.expires_at * 1000
            : Date.now() + 15 * 60 * 1000;
          setQrData({ image, expires_at: Math.floor(expires / 1000), bookingId: booking.bookingId });
          setExpiresAt(expires);
          setSuccess("Scan the QR code to complete payment.");
        } else {
          setSuccess("PromptPay initiated. Follow your banking app to complete payment.");
        }
        // Start polling for status
        setWaitingPayment(true);
        startPollingStatus(booking.bookingId);
        return;
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function startPollingStatus(bookingId) {
    let tries = 0;
    const maxTries = 60; // ~3 minutes @ 3s
    const iv = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          const status = data?.booking?.status;
          if (["PAID", "CONFIRMED", "COMPLETED"].includes(status)) {
            clearInterval(iv);
            setWaitingPayment(false);
            setSuccess("Payment received. Redirecting to My Bookings...");
            setTimeout(() => { window.location.href = "/my-bookings"; }, 1200);
          }
        }
      } catch {}
      if (tries >= maxTries) {
        clearInterval(iv);
        setWaitingPayment(false);
      }
    }, 3000);
  }

  // Handle 15-minute expiry countdown and auto-cancel
  useEffect(() => {
    if (!expiresAt || !currentBookingId) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0) {
        // auto-cancel pending booking
        fetch(`/api/bookings/${currentBookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' })
        }).catch(() => {});
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, currentBookingId]);

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
                min={todayStr}
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
                  <option key={t} value={t} disabled={!availableSlots.includes(t)}>
                    {t}{occupiedSlots.includes(t) ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

            <div>
              <label className="block mb-1">Number of People</label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity || undefined}
                className="w-full border rounded p-2 bg-white text-black"
                value={form.numberOfPeople}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const max = selectedRoom?.capacity || Infinity;
                  const clamped = Math.max(1, Math.min(val, max));
                  setForm({ ...form, numberOfPeople: clamped });
                }}
                required
              />
            {selectedRoom && (
              <p className="text-sm opacity-70 mt-1">
                Capacity: {selectedRoom.capacity} – Price: {selectedRoom.price} THB
              </p>
            )}
          </div>

          {session?.user?.email && (
            <div className="text-xs opacity-70">Booking will be associated with {session.user.email}</div>
          )}

          <div>
            <label className="block mb-1">Promotion</label>
            <select
              className="w-full border rounded p-2 bg-white text-black"
              value={form.promotionCode}
              onChange={(e) => setForm({ ...form, promotionCode: e.target.value })}
            >
              <option value="">No promotion</option>
              {promotions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {selectedRoom && (
              <p className="text-sm opacity-70 mt-1">Total: {priceAfterPromo} THB</p>
            )}
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
            </select>
          </div>

          <div className="pt-2">
            <button type="submit" className="bg-black text-white px-4 py-2 rounded" disabled={!session}>
              Confirm Booking
            </button>
          </div>

          {!session && (
            <div className="mt-2 text-sm">
              {authRequiredMsg} <a href="/login?callbackUrl=/booking" className="underline">Login</a>
            </div>
          )}

          {qrData && (
            <div className="mt-4 p-4 border rounded">
              <p className="mb-2">Scan this QR to pay with PromptPay:</p>
              <img src={qrData.image} alt="PromptPay QR" className="w-64 h-64" />
              <p className="text-sm opacity-70 mt-2">Booking: {qrData.bookingId}</p>
              {remainingSec !== null && remainingSec > 0 && (
                <p className="text-sm mt-1">Expires in {Math.floor(remainingSec/60)}m {remainingSec%60}s</p>
              )}
              {remainingSec === 0 && (
                <p className="text-sm mt-1 text-red-600">QR expired. Please create a new booking.</p>
              )}
              {waitingPayment && (
                <p className="text-sm mt-2">Waiting for payment confirmation...</p>
              )}
              <div className="mt-3">
                <a href="/my-bookings" className="underline">Go to My Bookings</a>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
