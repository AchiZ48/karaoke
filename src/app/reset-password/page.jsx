"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useToast } from "../components/toast/ToastProvider";

const passwordStrengthLabels = ["Too weak", "Weak", "Good", "Strong", "Very strong"];

function getStrength(value = "") {
  let score = 0;
  const pwd = value || "";
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
}

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

  const passwordStrength = useMemo(() => getStrength(password), [password]);
  const strengthLabel = password
    ? passwordStrengthLabels[passwordStrength] || passwordStrengthLabels[0]
    : "Enter a password";

  const canSubmit =
    password && confirm && password === confirm && token && email;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      const msg = "Passwords do not match";
      setError(msg);
      showToast(msg, "error");
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
      setMessage("Password reset successful. Redirecting to login...");
      showToast("Password reset successful", "success");
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#f8f8fa] min-h-screen inset-0 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#7b7bbd] to-[#2d184a] rounded-[2.5rem] shadow-lg p-10 flex flex-col items-center">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-center text-white mb-2">
            Change password
          </h1>
        </div>
        <hr className="w-full mb-6 border-gray-300" />
        {!token || !email ? (
          <p className="text-sm">
            Missing token or email. Please use the link from your email.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
            <label className="block text-md font-semibold mb-1 text-white">
              New Password
            </label>
            <input
              type="password"
              className="block p-3 w-full border border-gray-300 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <div className="mt-1">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      passwordStrength > i ? "bg-green-400" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-white/70 mt-1">{strengthLabel}</p>
            </div>
            <label className="block text-md font-semibold mb-1 text-white">
              Confirm Password
            </label>
            <input
              type="password"
              className="block p-3 w-full border border-gray-300 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-rose-200">{error}</p>}
            {message && <p className="text-sm text-emerald-200">{message}</p>}
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
