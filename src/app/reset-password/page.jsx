"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
// Navbar is provided by layout
import { useToast } from "../components/toast/ToastProvider";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const canSubmit = password && confirm && password === confirm && token && email;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match"); showToast('Passwords do not match','error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setMessage("Password reset successful. Redirecting to login..."); showToast('Password reset successful','success');
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(err.message); showToast(err.message,'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-purple-300 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-2xl font-semibold mb-4">Reset Password</h1>
        {!token || !email ? (
          <p className="text-sm">Missing token or email. Please use the link from your email.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {/* notifications handled globally by toasts */}

            <label className="block text-sm">New Password</label>
            <input
              type="password"
              className="block w-full bg-gray-200 p-2 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            <label className="block text-sm">Confirm Password</label>
            <input
              type="password"
              className="block w-full bg-gray-200 p-2 rounded-md"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />

            <button
              disabled={!canSubmit || loading}
              className="bg-black text-white px-4 py-2 rounded-md disabled:opacity-60"
              type="submit"
            >
              {loading ? "Saving..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

