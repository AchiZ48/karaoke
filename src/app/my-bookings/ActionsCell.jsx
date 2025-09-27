"use client";
import React from "react";
import { useToast } from "../components/toast/ToastProvider";

const timeSlots = [
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export default function ActionsCell({ bookingId, status, paymentMethod }) {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [showPromptPay, setShowPromptPay] = React.useState(false);
  const [qrData, setQrData] = React.useState(null);
  const [expiresAt, setExpiresAt] = React.useState(null);
  const [remainingSec, setRemainingSec] = React.useState(null);

  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showReschedule, setShowReschedule] = React.useState(false);
  const [rescheduleRoom, setRescheduleRoom] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleSlot, setRescheduleSlot] = React.useState("");
  const [availableSlots, setAvailableSlots] = React.useState([]);
  const [occupiedSlots, setOccupiedSlots] = React.useState([]);
  const [rescheduleLoading, setRescheduleLoading] = React.useState(false);
  const [rescheduleSaving, setRescheduleSaving] = React.useState(false);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState("");

  const canModify = ["PENDING", "PAID"].includes(status);

  const loadSlots = React.useCallback(
    async (roomNumber, date, preferredSlot) => {
      if (!roomNumber || !date) {
        setAvailableSlots(preferredSlot ? [preferredSlot] : []);
        setOccupiedSlots([]);
        return preferredSlot || "";
      }
      setSlotsLoading(true);
      setRescheduleError("");
      try {
        const params = new URLSearchParams({ roomNumber, date });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load availability");
        }
        const avail = data.available || [];
        const occ = data.occupied || [];
        setAvailableSlots(avail);
        setOccupiedSlots(occ);
        if (avail.length === 0) {
          return preferredSlot || "";
        }
        if (preferredSlot && avail.includes(preferredSlot)) {
          return preferredSlot;
        }
        return avail[0] || "";
      } catch (e) {
        setRescheduleError(e.message);
        showToast(e.message, "error");
        return preferredSlot || "";
      } finally {
        setSlotsLoading(false);
      }
    },
    [showToast],
  );

  async function handleCancel() {
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Cancel failed");
      setMsg("Cancelled");
      showToast("Booking cancelled", "success");
      window.location.reload();
    } catch (e) {
      setMsg(e.message);
      showToast(e.message, "error");
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  }

  async function handlePay() {
    try {
      setLoading(true);
      const res = await fetch("/api/payments/promptpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Payment init failed");
      const next = data.nextAction;
      if (next) {
        const expires = next?.expires_at
          ? next.expires_at * 1000
          : Date.now() + 15 * 60 * 1000;
        setQrData({
          image: next.image_url_png || next.image_data_url,
          expires_at: next?.expires_at,
          bookingId,
        });
        setExpiresAt(expires);
        setShowPromptPay(true);
        showToast("PromptPay QR ready");
      } else {
        setMsg("PromptPay initiated. Follow your banking app.");
        showToast("PromptPay initiated");
      }
    } catch (e) {
      setMsg(e.message);
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!expiresAt || !bookingId || !showPromptPay) return;
    const iv = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0) {
        clearInterval(iv);
        setShowPromptPay(false);
        fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        }).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, bookingId, showPromptPay]);

  React.useEffect(() => {
    if (!showPromptPay || !bookingId) return;
    let cancelled = false;
    let timeoutId = null;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          const nextStatus = data?.booking?.status;
          if (nextStatus && nextStatus !== "PENDING") {
            cancelled = true;
            setShowPromptPay(false);
            setMsg("Payment confirmed. Booking updated.");
            showToast("PromptPay payment confirmed", "success");
            window.location.reload();
            return;
          }
        }
      } catch (err) {
        // ignore polling errors
      }
      attempts += 1;
      if (!cancelled && attempts < 36) {
        timeoutId = setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [bookingId, showPromptPay, showToast]);

  async function openReschedule() {
    setRescheduleError("");
    setShowReschedule(true);
    setRescheduleLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load booking");
      const booking = data.booking || {};
      const roomNumber = booking?.room?.number || "";
      setRescheduleRoom(roomNumber);
      const dateStr = booking?.date
        ? new Date(booking.date).toISOString().slice(0, 10)
        : "";
      setRescheduleDate(dateStr);
      const slot = booking?.timeSlot || timeSlots[0];
      let nextSlot = slot;
      if (roomNumber && dateStr) {
        nextSlot = await loadSlots(roomNumber, dateStr, slot);
      } else {
        setAvailableSlots(slot ? [slot] : []);
        setOccupiedSlots([]);
      }
      setRescheduleSlot(nextSlot || "");
    } catch (e) {
      setRescheduleError(e.message);
      showToast(e.message, "error");
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleDateChange(value) {
    setRescheduleDate(value);
    if (!rescheduleRoom) return;
    const nextSlot = await loadSlots(rescheduleRoom, value, rescheduleSlot);
    setRescheduleSlot(nextSlot || "");
  }

  async function submitReschedule() {
    if (!rescheduleDate || !rescheduleSlot) {
      setRescheduleError("Please select a date and time slot.");
      return;
    }
    setRescheduleError("");
    setRescheduleSaving(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: rescheduleDate,
          timeSlot: rescheduleSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to reschedule");
      showToast("Booking rescheduled", "success");
      window.location.reload();
    } catch (e) {
      setRescheduleError(e.message);
      showToast(e.message, "error");
    } finally {
      setRescheduleSaving(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {canModify && (
        <button
          type="button"
          className="underline text-sm"
          onClick={openReschedule}
          disabled={loading}
        >
          Edit
        </button>
      )}
      {canModify && (
        <button
          className="text-sm underline"
          onClick={() => setShowCancelConfirm(true)}
          disabled={loading}
        >
          Cancel
        </button>
      )}
      {paymentMethod === "PROMPTPAY" && ["PENDING"].includes(status) && (
        <button
          className="text-sm underline"
          onClick={handlePay}
          disabled={loading}
        >
          Resume Payment
        </button>
      )}
      {msg && <span className="text-xs opacity-70">{msg}</span>}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !loading && setShowCancelConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-neutral-900 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Cancel booking?</h3>
            <p className="text-sm mb-4">
              Are you sure you want to cancel booking{" "}
              <span className="font-medium">{bookingId}</span>?
            </p>
            <div className="flex justify-end gap-3 text-sm">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-neutral-300"
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
              >
                Keep booking
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-60"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !rescheduleSaving && setShowReschedule(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Reschedule booking</h3>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => !rescheduleSaving && setShowReschedule(false)}
                disabled={rescheduleSaving}
              >
                Close
              </button>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Booking ID:{" "}
              <span className="font-medium text-neutral-900">{bookingId}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  min={new Date().toISOString().slice(0, 10)}
                  disabled={rescheduleLoading || rescheduleSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Time slot
                </label>
                <select
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  disabled={
                    rescheduleLoading ||
                    rescheduleSaving ||
                    slotsLoading ||
                    (availableSlots.length === 0 && !rescheduleSlot)
                  }
                >
                  {rescheduleSlot &&
                    !availableSlots.includes(rescheduleSlot) && (
                      <option value={rescheduleSlot}>
                        {rescheduleSlot} (currently booked)
                      </option>
                    )}
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {slotsLoading && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Checking availability...
                  </p>
                )}
                {!slotsLoading && availableSlots.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1">
                    No available slots for the selected day.
                  </p>
                )}
                {!slotsLoading && occupiedSlots.length > 0 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Unavailable: {occupiedSlots.join(", ")}
                  </p>
                )}
              </div>
            </div>
            {rescheduleError && (
              <div className="mt-3 text-sm text-rose-500">
                {rescheduleError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-neutral-300"
                onClick={() => setShowReschedule(false)}
                disabled={rescheduleSaving}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-60"
                onClick={submitReschedule}
                disabled={rescheduleSaving || rescheduleLoading}
              >
                {rescheduleSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
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
                <p className="text-sm mt-2 text-red-600">QR expired.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
