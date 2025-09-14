"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "../components/toast/ToastProvider";

const timeSlots = [
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export default function BookingPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
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
  const [locked, setLocked] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [showPromptPay, setShowPromptPay] = useState(false);
  const [expiredHandled, setExpiredHandled] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    date: "",
    timeSlot: timeSlots[0],
    numberOfPeople: 1,
    // name/email/phone derived from session on server
    paymentMethod: "PROMPTPAY",
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

        setClientSecret(payData.clientSecret || "");
        setLocked(true);
        setWaitingPayment(true);
        const next = payData.nextAction;
        if (next) {
          const expires = next?.expires_at ? next.expires_at * 1000 : Date.now() + 15 * 60 * 1000;
          setQrData({ image: next.image_url_png || next.image_data_url, expires_at: next?.expires_at, bookingId: booking.bookingId });
          setExpiresAt(expires);
          setShowPromptPay(true);
          setSuccess("Scan the QR code to complete payment.");
          showToast('PromptPay QR ready');
        } else {
          setSuccess("PromptPay initiated. Follow your banking app to complete payment.");
          showToast('PromptPay initiated');
        }
        // Start polling for status
        startPollingStatus(booking.bookingId);
        return;
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    }
  }

  // no Stripe popup; showing our own modal with QR

  function startPollingStatus(bookingId) {
    let tries = 0;
    const maxTries = 180; // up to ~15 minutes @ 5s
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
            showToast('Payment received', 'success');
            setTimeout(() => { window.location.href = "/my-bookings"; }, 1200);
          }
        }
      } catch {}
      if (tries >= maxTries || (expiresAt && Date.now() >= expiresAt)) {
        clearInterval(iv);
        setWaitingPayment(false);
      }
    }, 5000);
  }

  // Handle 15-minute expiry countdown and auto-cancel
  useEffect(() => {
    if (!expiresAt || !currentBookingId) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0 && !expiredHandled) {
        setExpiredHandled(true);
        // auto-cancel pending booking
        fetch(`/api/bookings/${currentBookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' })
        }).then(()=>{
          setWaitingPayment(false);
          setLocked(false);
          showToast('Payment expired. Booking cancelled.', 'error');
        }).catch(() => {});
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, currentBookingId, expiredHandled]);

  // using global toast provider (useToast)

  return (
    <main>
      <div className="mx-auto justify-center flex py-5 px-2">
        <div className="container p-4 max-w-3xl bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-4xl py-5 px-6 text-black dark:text-white ">
        {/* toasts are global via ToastProvider */}
        <h1 className="text-2xl font-semibold mb-4">Book a Room</h1>

        {/* notifications handled via global toasts */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Room</label>
            {loadingRooms ? (
              <div className="opacity-70">Loading rooms…</div>
            ) : (
              <select
                className="w-full border-2 border-black rounded-full p-2 bg-white text-black"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                disabled={locked}
              >
                {rooms.map((r) => (
                  <option key={r.number} value={r.number}>
                    {r.name} ({r.type}) — {r.capacity} ppl — {r.price} THB
                  </option>
                ))}
              </select>
            )}
          </div>

            <div>
              <label className="block mb-1">Date</label>
              <input
                type="date"
                className="w-full border-2 border-black rounded-full p-2 bg-white text-black"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={todayStr}
                required
                disabled={locked}
              />
            </div>
            <div>
              <label className="block mb-1">Time Slot</label>
              <select
                className="w-full border-2 border-black rounded-full p-2 bg-white text-black "
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                disabled={locked}
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t} disabled={!availableSlots.includes(t)}>
                    {t}{occupiedSlots.includes(t) ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label className="block mb-1">Number of People </label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity || undefined}
                className="w-full border-2 border-black rounded-full p-2 bg-white text-black"
                value={form.numberOfPeople}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const max = selectedRoom?.capacity || Infinity;
                  const clamped = Math.max(1, Math.min(val, max));
                  setForm({ ...form, numberOfPeople: clamped });
                }}
                required
                disabled={locked}
              />
            {selectedRoom && (
              <p className="text-sm opacity-70 mt-1">
                Capacity: {selectedRoom.capacity} – Price: {selectedRoom.price} THB
              </p>
            )}
          </div>

          

          <div>
            <label className="block mb-1">Promotion</label>
            <select
              className="w-full border-2 border-black dark:border-neutral-700 rounded-full p-2 bg-white dark:bg-neutral-900 text-black dark:text-white"
              value={form.promotionCode}
              onChange={(e) => setForm({ ...form, promotionCode: e.target.value })}
              disabled={locked}
            >
              <option value="">No promotion</option>
              {promotions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            
          </div>

          <div>
            <label className="block mb-1">Payment Method</label>
            <select
              className="w-full border-2 border-black dark:border-neutral-700 rounded-full p-2 bg-white dark:bg-neutral-900 text-black dark:text-white"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              disabled={locked}
            >
              <option value="PROMPTPAY">PromptPay</option>
              <option value="CASH">Cash</option>              
            </select>
          </div>
          {session?.user?.email && (
            <div className="text-xs opacity-70">Booking will be associated with {session.user.email}</div>
          )}
          {selectedRoom && (
              <p className="text-sm opacity-70 mt-1">Total: {priceAfterPromo} THB</p>
            )}

          <div className="pt-2 inline-flex gap-4 justify-center">
            {waitingPayment && (
            <>
                <button type="button" className="bg-red-500 text-white px-4 py-3 rounded-full" onClick={() => {
                  if (!currentBookingId) return;
                  fetch(`/api/bookings/${currentBookingId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'cancel' }) }).then(()=>{
                    setWaitingPayment(false); setLocked(false); setSuccess('Booking cancelled');
                  });
                }}>Cancel booking</button>
                <button type="button" className="bg-black text-white px-4 py-3 rounded-full" onClick={() => setShowPromptPay(true)} disabled={remainingSec===0}>Show PromptPay QR</button>
                
            </>
          )}
            {!waitingPayment && (
            <>
                <button type="submit" className="bg-black text-white px-4 py-3 rounded-full" disabled={!session || locked}>Confirm Booking</button>
            </>
          )}



          
            
        </div>

          {!session && (
            <div className="mt-2 text-sm">
              {authRequiredMsg} <a href="/login?callbackUrl=/booking" className="underline">Login</a>
            </div>
          )}

          
          {showPromptPay && qrData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={()=>setShowPromptPay(false)} />
              <div className="relative bg-white text-black rounded-lg p-4 w-full max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">PromptPay</div>
                  <button onClick={()=>setShowPromptPay(false)} className="text-sm underline">Close</button>
                </div>
                <div className="flex flex-col items-center">
                  <img src={qrData.image} alt="PromptPay QR" className="w-64 h-64" />
                  {remainingSec !== null && remainingSec > 0 && (
                    <p className="text-sm mt-2">Expires in {Math.floor(remainingSec/60)}m {remainingSec%60}s</p>
                  )}
                  {remainingSec === 0 && (
                    <p className="text-sm mt-2 text-red-600">QR expired. Please create a new booking.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
        </div>
      </div>
    </main>
  );
}
