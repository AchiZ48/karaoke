"use client";
import React from "react";
import { useToast } from "../components/toast/ToastProvider";

export default function ActionsCell({ bookingId, status, paymentMethod }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [showPromptPay, setShowPromptPay] = React.useState(false);
  const [qrData, setQrData] = React.useState(null);
  const [expiresAt, setExpiresAt] = React.useState(null);
  const [remainingSec, setRemainingSec] = React.useState(null);
  const { showToast } = useToast();
  async function handleCancel() {
    if (!confirm(`Cancel ${bookingId}?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Cancel failed');
      setMsg('Cancelled'); showToast('Booking cancelled','success');
      window.location.reload();
    } catch (e) {
      setMsg(e.message); showToast(e.message,'error');
    } finally { setLoading(false); }
  }
  async function handlePay() {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/promptpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Payment init failed');
      const next = data.nextAction;
      if (next) {
        const expires = next?.expires_at ? next.expires_at * 1000 : Date.now() + 15 * 60 * 1000;
        setQrData({ image: next.image_url_png || next.image_data_url, expires_at: next?.expires_at, bookingId });
        setExpiresAt(expires);
        setShowPromptPay(true);
        showToast('PromptPay QR ready');
      } else {
        setMsg('PromptPay initiated. Follow your banking app.'); showToast('PromptPay initiated');
      }
    } catch (e) {
      setMsg(e.message); showToast(e.message,'error');
    } finally { setLoading(false); }
  }
  React.useEffect(() => {
    if (!expiresAt || !bookingId || !showPromptPay) return;
    const iv = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0) {
        clearInterval(iv);
        setShowPromptPay(false);
        fetch(`/api/bookings/${bookingId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: 'cancel' }) }).catch(()=>{});
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, bookingId, showPromptPay]);
  return (
    <div className="flex gap-2 items-center">
      <a href={`/booking?reschedule=${bookingId}`} className="underline text-sm">Edit</a>
      {['PENDING','CONFIRMED'].includes(status) && (
        <button className="text-sm underline" onClick={handleCancel} disabled={loading}>Cancel</button>
      )}
      {paymentMethod === 'PROMPTPAY' && ['PENDING'].includes(status) && (
        <button className="text-sm underline" onClick={handlePay} disabled={loading}>Resume Payment</button>
      )}
      {msg && <span className="text-xs opacity-70">{msg}</span>}
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
                <p className="text-sm mt-2 text-red-600">QR expired.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
