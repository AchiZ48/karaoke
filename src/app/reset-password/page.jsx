"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useToast } from "../components/toast/ToastProvider";

// รูปตา
// View.png = เปิดดูรหัส, Veiw_Hide.png = ซ่อนรหัส

const passwordStrengthLabels = [
  "Too weak",
  "Weak",
  "Good",
  "Strong",
  "Very strong",
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="block p-3 w-full border border-gray-300 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-indigo-300"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    className="stroke-black stroke-2"
                    width="24"
                    height="24"
                    viewBox="0 0 140 140"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                    className="stroke-black stroke-2"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeMiterlimit="100"
                      d="M56.89 53.17c-5.01 3.91-8.22 9.99-8.22 16.83 0 11.78 9.55 21.33 21.33 21.33 6.84 0 12.92-3.21 16.83-8.22l1.42 1.43c-4.28 5.36-10.86 8.79-18.25 8.79h-0.6c-12.61-0.32-22.73-10.64-22.73-23.33 0-7.39 3.43-13.98 8.79-18.25zm13.12-6.51c12.88 0 23.33 10.45 23.33 23.34l-0.01 0.6c-0.1 4.18-1.31 8.08-3.33 11.43l-1.46-1.46c1.78-3.12 2.8-6.73 2.8-10.57 0-11.79-9.55-21.34-21.33-21.34-3.85 0-7.46 1.02-10.58 2.8l-1.46-1.46c3.51-2.12 7.63-3.34 12.04-3.34z"
                    />
                    <path
                    className="stroke-black stroke-2"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeMiterlimit="100"
                      d="M46.85 43.14c-3.66 2.19-7.09 4.73-10.21 7.37-9.08 7.67-15.47 16.08-17.57 18.99q-0.14 0.19-0.22 0.32-0.09 0.12-0.12 0.18 0.03 0.06 0.12 0.18 0.08 0.13 0.22 0.32c2.1 2.91 8.49 11.32 17.57 18.99 9.09 7.68 20.74 14.51 33.36 14.51 10.11 0 19.59-4.38 27.64-10.07l1.43 1.43c-8.3 5.93-18.29 10.64-29.07 10.64-13.32 0-25.42-7.19-34.65-14.99-9.25-7.81-15.76-16.37-17.9-19.35-0.17-0.23-0.35-0.48-0.48-0.71-0.14-0.26-0.26-0.57-0.26-0.95 0-0.38 0.12-0.69 0.26-0.95 0.13-0.23 0.31-0.48 0.48-0.71 2.14-2.98 8.65-11.54 17.9-19.35 3.05-2.59 6.42-5.1 10.04-7.31zm23.15-9.14c13.33 0.01 25.43 7.19 34.66 14.99 9.25 7.82 15.75 16.37 17.9 19.35 0.16 0.23 0.35 0.48 0.47 0.71 0.15 0.27 0.26 0.58 0.26 0.95 0 0.38-0.11 0.69-0.26 0.96-0.12 0.23-0.31 0.48-0.47 0.71-2.15 2.98-8.65 11.53-17.9 19.35q-1.52 1.29-3.15 2.54l-1.42-1.43q1.69-1.29 3.28-2.64c9.07-7.67 15.46-16.08 17.56-18.99q0.14-0.19 0.23-0.32 0.08-0.12 0.11-0.18-0.03-0.05-0.11-0.17-0.09-0.13-0.23-0.32c-2.1-2.91-8.49-11.32-17.56-18.99-9.09-7.69-20.74-14.51-33.37-14.52-7.23 0-14.14 2.25-20.44 5.61l-1.47-1.48c6.66-3.64 14.07-6.13 21.91-6.13z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="stroke-black stroke-2"
                    width="24"
                    height="24"
                    viewBox="0 0 140 140"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                    className="stroke-black stroke-2"
                      d="M56.8857 53.1729C51.8835 57.0769 48.6671 63.1629 48.667 70C48.6672 81.7818 58.2182 91.3338 70 91.334C76.8372 91.3339 82.9219 88.1158 86.8262 83.1133L88.25 84.5371C83.9747 89.8973 77.3892 93.3339 70 93.334L69.3984 93.3262C56.7901 93.0069 46.6672 82.6853 46.667 70C46.6671 62.6109 50.1019 56.0242 55.4619 51.749L56.8857 53.1729ZM70 46.667C82.8864 46.6672 93.3338 57.1136 93.334 70L93.3262 70.6025C93.2203 74.7794 92.0147 78.6825 89.9912 82.0361L88.5303 80.5752C90.3132 77.4579 91.3339 73.8483 91.334 70C91.3338 58.2182 81.7818 48.6672 70 48.667C66.1517 48.667 62.5411 49.6858 59.4238 51.4688L57.9629 50.0078C61.4773 47.8873 65.5962 46.6671 70 46.667Z"
                      fill="currentColor"
                    />
                    <path
                    className="stroke-black stroke-2"
                      d="M46.8496 43.1377C43.1864 45.3337 39.7609 47.8731 36.6367 50.5137C27.5635 58.1825 21.1698 66.59 19.0703 69.5049C18.9774 69.6338 18.9055 69.7338 18.8457 69.8213C18.7898 69.903 18.7551 69.9593 18.7324 70C18.7551 70.0407 18.7898 70.097 18.8457 70.1787C18.9055 70.2662 18.9774 70.3662 19.0703 70.4951C21.1698 73.41 27.5635 81.8175 36.6367 89.4863C45.7297 97.1718 57.3773 104 70 104C80.1092 104 89.5918 99.6188 97.6387 93.9268L99.0732 95.3613C90.7654 101.292 80.7835 106 70 106C56.6767 106 44.5756 98.8149 35.3457 91.0137C26.0966 83.1962 19.5931 74.6434 17.4473 71.6641C17.2799 71.4316 17.0993 71.184 16.9717 70.9502C16.8272 70.6853 16.7139 70.3762 16.7139 70C16.7139 69.6238 16.8272 69.3147 16.9717 69.0498C17.0993 68.816 17.2799 68.5684 17.4473 68.3359C19.5931 65.3566 26.0966 56.8038 35.3457 48.9863C38.4005 46.4044 41.7706 43.8914 45.3945 41.6826L46.8496 43.1377ZM70 34C83.3233 34.0001 95.4245 41.1851 104.654 48.9863C113.903 56.8039 120.407 65.3567 122.553 68.3359C122.72 68.5684 122.901 68.816 123.028 69.0498C123.173 69.3146 123.286 69.6239 123.286 70C123.286 70.3761 123.173 70.6854 123.028 70.9502C122.901 71.184 122.72 71.4316 122.553 71.6641C120.407 74.6433 113.903 83.1961 104.654 91.0137C103.64 91.8712 102.589 92.7189 101.507 93.5527L100.081 92.127C101.208 91.2641 102.304 90.382 103.363 89.4863C112.437 81.8174 118.83 73.4099 120.93 70.4951C121.023 70.3662 121.094 70.2662 121.154 70.1787C121.21 70.0972 121.244 70.0407 121.267 70C121.244 69.9593 121.21 69.9028 121.154 69.8213C121.094 69.7338 121.023 69.6338 120.93 69.5049C118.83 66.5901 112.437 58.1826 103.363 50.5137C94.2704 42.8282 82.6227 36.0001 70 36C62.7667 36 55.8542 38.2437 49.5586 41.6045L48.082 40.1279C54.7405 36.4894 62.1585 34 70 34Z"
                      fill="currentColor"
                    />
                    <path
                    className="stroke-black stroke-2"
                      d="M29.1665 11.6667L122.5 105"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
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
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="block p-3 w-full border border-gray-300 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-indigo-300"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <svg
                    className="stroke-black stroke-2"
                    width="24"
                    height="24"
                    viewBox="0 0 140 140"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                    className="stroke-black stroke-2"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeMiterlimit="100"
                      d="M56.89 53.17c-5.01 3.91-8.22 9.99-8.22 16.83 0 11.78 9.55 21.33 21.33 21.33 6.84 0 12.92-3.21 16.83-8.22l1.42 1.43c-4.28 5.36-10.86 8.79-18.25 8.79h-0.6c-12.61-0.32-22.73-10.64-22.73-23.33 0-7.39 3.43-13.98 8.79-18.25zm13.12-6.51c12.88 0 23.33 10.45 23.33 23.34l-0.01 0.6c-0.1 4.18-1.31 8.08-3.33 11.43l-1.46-1.46c1.78-3.12 2.8-6.73 2.8-10.57 0-11.79-9.55-21.34-21.33-21.34-3.85 0-7.46 1.02-10.58 2.8l-1.46-1.46c3.51-2.12 7.63-3.34 12.04-3.34z"
                    />
                    <path
                    className="stroke-black stroke-2"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeMiterlimit="100"
                      d="M46.85 43.14c-3.66 2.19-7.09 4.73-10.21 7.37-9.08 7.67-15.47 16.08-17.57 18.99q-0.14 0.19-0.22 0.32-0.09 0.12-0.12 0.18 0.03 0.06 0.12 0.18 0.08 0.13 0.22 0.32c2.1 2.91 8.49 11.32 17.57 18.99 9.09 7.68 20.74 14.51 33.36 14.51 10.11 0 19.59-4.38 27.64-10.07l1.43 1.43c-8.3 5.93-18.29 10.64-29.07 10.64-13.32 0-25.42-7.19-34.65-14.99-9.25-7.81-15.76-16.37-17.9-19.35-0.17-0.23-0.35-0.48-0.48-0.71-0.14-0.26-0.26-0.57-0.26-0.95 0-0.38 0.12-0.69 0.26-0.95 0.13-0.23 0.31-0.48 0.48-0.71 2.14-2.98 8.65-11.54 17.9-19.35 3.05-2.59 6.42-5.1 10.04-7.31zm23.15-9.14c13.33 0.01 25.43 7.19 34.66 14.99 9.25 7.82 15.75 16.37 17.9 19.35 0.16 0.23 0.35 0.48 0.47 0.71 0.15 0.27 0.26 0.58 0.26 0.95 0 0.38-0.11 0.69-0.26 0.96-0.12 0.23-0.31 0.48-0.47 0.71-2.15 2.98-8.65 11.53-17.9 19.35q-1.52 1.29-3.15 2.54l-1.42-1.43q1.69-1.29 3.28-2.64c9.07-7.67 15.46-16.08 17.56-18.99q0.14-0.19 0.23-0.32 0.08-0.12 0.11-0.18-0.03-0.05-0.11-0.17-0.09-0.13-0.23-0.32c-2.1-2.91-8.49-11.32-17.56-18.99-9.09-7.69-20.74-14.51-33.37-14.52-7.23 0-14.14 2.25-20.44 5.61l-1.47-1.48c6.66-3.64 14.07-6.13 21.91-6.13z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="stroke-black stroke-2"
                    width="24"
                    height="24"
                    viewBox="0 0 140 140"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                    className="stroke-black stroke-2"
                      d="M56.8857 53.1729C51.8835 57.0769 48.6671 63.1629 48.667 70C48.6672 81.7818 58.2182 91.3338 70 91.334C76.8372 91.3339 82.9219 88.1158 86.8262 83.1133L88.25 84.5371C83.9747 89.8973 77.3892 93.3339 70 93.334L69.3984 93.3262C56.7901 93.0069 46.6672 82.6853 46.667 70C46.6671 62.6109 50.1019 56.0242 55.4619 51.749L56.8857 53.1729ZM70 46.667C82.8864 46.6672 93.3338 57.1136 93.334 70L93.3262 70.6025C93.2203 74.7794 92.0147 78.6825 89.9912 82.0361L88.5303 80.5752C90.3132 77.4579 91.3339 73.8483 91.334 70C91.3338 58.2182 81.7818 48.6672 70 48.667C66.1517 48.667 62.5411 49.6858 59.4238 51.4688L57.9629 50.0078C61.4773 47.8873 65.5962 46.6671 70 46.667Z"
                      fill="currentColor"
                    />
                    <path
                    className="stroke-black stroke-2"
                      d="M46.8496 43.1377C43.1864 45.3337 39.7609 47.8731 36.6367 50.5137C27.5635 58.1825 21.1698 66.59 19.0703 69.5049C18.9774 69.6338 18.9055 69.7338 18.8457 69.8213C18.7898 69.903 18.7551 69.9593 18.7324 70C18.7551 70.0407 18.7898 70.097 18.8457 70.1787C18.9055 70.2662 18.9774 70.3662 19.0703 70.4951C21.1698 73.41 27.5635 81.8175 36.6367 89.4863C45.7297 97.1718 57.3773 104 70 104C80.1092 104 89.5918 99.6188 97.6387 93.9268L99.0732 95.3613C90.7654 101.292 80.7835 106 70 106C56.6767 106 44.5756 98.8149 35.3457 91.0137C26.0966 83.1962 19.5931 74.6434 17.4473 71.6641C17.2799 71.4316 17.0993 71.184 16.9717 70.9502C16.8272 70.6853 16.7139 70.3762 16.7139 70C16.7139 69.6238 16.8272 69.3147 16.9717 69.0498C17.0993 68.816 17.2799 68.5684 17.4473 68.3359C19.5931 65.3566 26.0966 56.8038 35.3457 48.9863C38.4005 46.4044 41.7706 43.8914 45.3945 41.6826L46.8496 43.1377ZM70 34C83.3233 34.0001 95.4245 41.1851 104.654 48.9863C113.903 56.8039 120.407 65.3567 122.553 68.3359C122.72 68.5684 122.901 68.816 123.028 69.0498C123.173 69.3146 123.286 69.6239 123.286 70C123.286 70.3761 123.173 70.6854 123.028 70.9502C122.901 71.184 122.72 71.4316 122.553 71.6641C120.407 74.6433 113.903 83.1961 104.654 91.0137C103.64 91.8712 102.589 92.7189 101.507 93.5527L100.081 92.127C101.208 91.2641 102.304 90.382 103.363 89.4863C112.437 81.8174 118.83 73.4099 120.93 70.4951C121.023 70.3662 121.094 70.2662 121.154 70.1787C121.21 70.0972 121.244 70.0407 121.267 70C121.244 69.9593 121.21 69.9028 121.154 69.8213C121.094 69.7338 121.023 69.6338 120.93 69.5049C118.83 66.5901 112.437 58.1826 103.363 50.5137C94.2704 42.8282 82.6227 36.0001 70 36C62.7667 36 55.8542 38.2437 49.5586 41.6045L48.082 40.1279C54.7405 36.4894 62.1585 34 70 34Z"
                      fill="currentColor"
                    />
                    <path
                    className="stroke-black stroke-2"
                      d="M29.1665 11.6667L122.5 105"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
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
