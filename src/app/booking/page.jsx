"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  const isAdmin = session?.user?.role === "admin";
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
    paymentMethod: "PROMPTPAY",
    promotionCode: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.number === form.roomNumber),
    [rooms, form.roomNumber],
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
    if (!session || isAdmin) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || session.user?.name || "",
      customerEmail: prev.customerEmail || session.user?.email || "",
    }));
  }, [session, isAdmin]);

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
        const params = new URLSearchParams({
          roomNumber: form.roomNumber,
          date: form.date,
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableSlots(data.available || timeSlots);
          setOccupiedSlots(data.occupied || []);
          if (!data.available?.includes(form.timeSlot)) {
            setForm((f) => ({
              ...f,
              timeSlot: (data.available || [timeSlots[0]])[0],
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadAvailability();
  }, [form.roomNumber, form.date]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

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

  const emailRegex = /^\S+@\S+\.\S+$/;
  const successRedirect = isAdmin ? "/admin" : "/my-bookings";
  const successRedirectLabel = isAdmin ? "Admin Dashboard" : "My Bookings";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setQrData(null);

    const payload = {
      roomNumber: form.roomNumber,
      date: form.date,
      timeSlot: form.timeSlot,
      numberOfPeople: Number(form.numberOfPeople) || 0,
      paymentMethod: form.paymentMethod,
    };

    const promoCode = form.promotionCode ? form.promotionCode.trim() : "";
    if (promoCode) {
      payload.promotionCode = promoCode;
    }

    if (isAdmin) {
      const walkInName = form.customerName.trim();
      const walkInEmail = form.customerEmail.trim();
      const walkInPhone = form.customerPhone.trim();
      if (!walkInName || !walkInEmail || !walkInPhone) {
        const msg = "Customer name, email, and phone are required.";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      if (!emailRegex.test(walkInEmail)) {
        const msg = "Customer email looks invalid.";
        setError(msg);
        showToast(msg, "error");
        return;
      }
      payload.customerName = walkInName;
      payload.customerEmail = walkInEmail.toLowerCase();
      payload.customerPhone = walkInPhone;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create booking");
      }
      const booking = data.booking;
      setCurrentBookingId(booking.bookingId);
      if (form.paymentMethod === "CASH") {
        setSuccess(
          `Booking created: ${booking.bookingId}. Redirecting to ${successRedirectLabel}...`,
        );
        window.location.href = successRedirect;
        return;
      }
      if (form.paymentMethod === "PROMPTPAY") {
        const payRes = await fetch("/api/payments/promptpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) {
          throw new Error(payData?.message || "Payment init failed");
        }

        setClientSecret(payData.clientSecret || "");
        setLocked(true);
        setWaitingPayment(true);
        const next = payData.nextAction;
        if (next) {
          const expires = next?.expires_at
            ? next.expires_at * 1000
            : Date.now() + 15 * 60 * 1000;
          setQrData({
            image: next.image_url_png || next.image_data_url,
            expires_at: next?.expires_at,
            bookingId: booking.bookingId,
          });
          setExpiresAt(expires);
          setShowPromptPay(true);
          setSuccess("Scan the QR code to complete payment.");
          showToast("PromptPay QR ready");
        } else {
          setSuccess(
            "PromptPay initiated. Follow your banking app to complete payment.",
          );
          showToast("PromptPay initiated");
        }
        startPollingStatus(
          booking.bookingId,
          successRedirect,
          successRedirectLabel,
        );
        return;
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  function startPollingStatus(bookingId, redirectPath, redirectLabel) {
    let tries = 0;
    const maxTries = 180;
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
            setSuccess(`Payment received. Redirecting to ${redirectLabel}...`);
            showToast("Payment received", "success");
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 1200);
          }
        }
      } catch {}
      if (tries >= maxTries || (expiresAt && Date.now() >= expiresAt)) {
        clearInterval(iv);
        setWaitingPayment(false);
      }
    }, 5000);
  }

  useEffect(() => {
    if (!expiresAt || !currentBookingId) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0 && !expiredHandled) {
        setExpiredHandled(true);
        fetch(`/api/bookings/${currentBookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        })
          .then(() => {
            setWaitingPayment(false);
            setLocked(false);
            showToast("Payment expired. Booking cancelled.", "error");
          })
          .catch(() => {});
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, currentBookingId, expiredHandled]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white py-16">
      <div className="flex justify-center items-center w-full py-10 px-2">
        <div className="w-full max-w-xl rounded-3xl shadow-2xl bg-gradient-to-b from-[#7b7bbd]  to-[#2A2A45] p-8 border border-white/10 relative">
          <h1 className="text-2xl font-semibold text-white text-center mb-6">
            Book a Room
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Room */}
            <div>
              <label className="block mb-2 text-white font-medium">Room</label>
              {loadingRooms ? (
                <select className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium animate-pulse"></select>
              ) : (
                <select
                  className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                  value={form.roomNumber}
                  onChange={(e) =>
                    setForm({ ...form, roomNumber: e.target.value })
                  }
                  disabled={locked}
                >
                  {rooms.map((r) => (
                    <option key={r.number} value={r.number}>
                      {r.name} ({r.type}) - {r.capacity} ppl - {r.price} THB
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Date */}
            <div>
              <label className="block mb-2 text-white font-medium">Date</label>
              <input
                type="date"
                className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={todayStr}
                required
                disabled={locked}
              />
            </div>
            {/* Time Slot */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Time Slot
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {timeSlots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`rounded-xl px-2 py-2 text-sm font-semibold transition
                      ${
                        form.timeSlot === t
                          ? "bg-white text-[#6B3FA0] shadow"
                          : availableSlots.includes(t)
                            ? "bg-white/20 text-white hover:bg-white/40"
                            : "bg-gray-400 text-gray-200 cursor-not-allowed"
                      }`}
                    onClick={() =>
                      availableSlots.includes(t) &&
                      setForm({ ...form, timeSlot: t })
                    }
                    disabled={!availableSlots.includes(t) || locked}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {isAdmin && (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                  Walk-in customer details
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-2 text-white font-medium">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                      value={form.customerName}
                      onChange={(e) =>
                        setForm({ ...form, customerName: e.target.value })
                      }
                      disabled={locked}
                      required
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-white font-medium">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                      value={form.customerEmail}
                      onChange={(e) =>
                        setForm({ ...form, customerEmail: e.target.value })
                      }
                      disabled={locked}
                      required
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-white font-medium">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                      value={form.customerPhone}
                      onChange={(e) =>
                        setForm({ ...form, customerPhone: e.target.value })
                      }
                      disabled={locked}
                      required
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Number of People */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Number of People
              </label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity || undefined}
                className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                value={form.numberOfPeople}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const max = selectedRoom?.capacity || Infinity;
                  const clamped = Math.max(1, Math.min(val, max));
                  setForm({ ...form, numberOfPeople: clamped });
                }}
                required
                disabled={locked}
                placeholder="Enter number of people"
              />
              {selectedRoom && (
                <p className="text-sm text-white opacity-80 mt-1">
                  Capacity: {selectedRoom.capacity} - Price:{" "}
                  {selectedRoom.price} THB
                </p>
              )}
            </div>
            {/* Promotion */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Promotion
              </label>
              <select
                className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                value={form.promotionCode}
                onChange={(e) =>
                  setForm({ ...form, promotionCode: e.target.value })
                }
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
            {/* Payment Method */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Payment Method
              </label>
              <select
                className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
                disabled={locked}
              >
                <option value="PROMPTPAY">PromptPay</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            {/* Total */}
            {selectedRoom && (
              <p className="text-sm text-white opacity-80 mt-1">
                Total: {priceAfterPromo} THB
              </p>
            )}
            {/* Buttons */}
            <div className="flex gap-4 pt-2 justify-center">
              {waitingPayment && (
                <>
                  <button
                    type="button"
                    className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition"
                    onClick={() => {
                      if (!currentBookingId) return;
                      fetch(`/api/bookings/${currentBookingId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "cancel" }),
                      }).then(() => {
                        setWaitingPayment(false);
                        setLocked(false);
                        setSuccess("Booking cancelled");
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="bg-[#97EF7C] text-black px-6 py-3 rounded-xl font-semibold shadow hover:bg-[#5a338c] transition"
                    onClick={() => setShowPromptPay(true)}
                    disabled={remainingSec === 0}
                  >
                    Show PromptPay QR
                  </button>
                </>
              )}

              <button
                type="submit"
                className="bg-[#6768AB] text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-[#5a338c] transition"
                disabled={!session || locked}
              >
                Confirm Booking
              </button>
            </div>
            {/* Error/Success */}
            {error && <div className="text-red-300 text-center">{error}</div>}
            {success && (
              <div className="text-green-200 text-center">{success}</div>
            )}
            {!session && (
              <div className="mt-2 text-sm text-white">
                {authRequiredMsg}{" "}
                <a href="/login?callbackUrl=/booking" className="underline">
                  Login
                </a>
              </div>
            )}
            {showPromptPay && qrData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setShowPromptPay(false)}
                />
                <div className="relative bg-white text-black rounded-lg p-4 w-full max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">PromptPay</div>
                    <button
                      onClick={() => setShowPromptPay(false)}
                      className="text-sm underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col items-center">
                    <img
                      src={qrData.image}
                      alt="PromptPay QR"
                      className="w-64 h-64"
                    />
                    {remainingSec !== null && remainingSec > 0 && (
                      <p className="text-sm mt-2">
                        Expires in {Math.floor(remainingSec / 60)}m{" "}
                        {remainingSec % 60}s
                      </p>
                    )}
                    {remainingSec === 0 && (
                      <p className="text-sm mt-2 text-red-600">
                        QR expired. Please create a new booking.
                      </p>
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
