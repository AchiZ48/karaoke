"use client";
import React, { useState } from "react";
// Navbar is provided by layout
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "../components/toast/ToastProvider";
import { redirect } from "next/navigation";
import { useEffect } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res.error) {
        setError("Invalid credentials");
        showToast("Invalid credentials", "error");
        return;
      }
      showToast("Login successful", "success");
      router.replace("welcome");
    } catch (error) {
      console.log(error);
    }
  };

  const handleForgot = async () => {
    setError("");
    setInfo("");
    if (!email) {
      setError("Please enter your email first");
      showToast("Please enter your email first", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send reset link");
      setInfo("If the email exists, a reset link was sent.");
      showToast("If the email exists, a reset link was sent.", "info");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-700 to-purple-500">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-lg p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-center text-indigo-900 dark:text-white mb-2">
          Welcome Back !
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-gray-300 mb-6">
          Login to your account
        </p>
        <hr className="w-full mb-6 border-gray-300 dark:border-neutral-700" />
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4"
        >
          <div>
            <label className="block text-md font-semibold mb-1 text-indigo-900 dark:text-white">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block p-3 w-full border border-gray-300 rounded-xl bg-gray-100 dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="email"
              placeholder="adminuser@gmail.com"
              autoComplete="email"
            />
          </div>
          <div className="relative flex flex-col">
            <label className="block text-md font-semibold mb-1 text-indigo-900 dark:text-white">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block p-3 w-full border border-gray-300 rounded-xl bg-gray-100 dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500 hover:text-indigo-600"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye icon (visible)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.75 7.5 7.5 4.5 12 4.5c4.5 0 8.25 3 9.75 7.5-1.5 4.5-5.25 7.5-9.75 7.5-4.5 0-8.25-3-9.75-7.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                ) : (
                  // Eye with slash icon (hidden)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-5.12M21 12c0 5.523-4.477 10-10 10a9.96 9.96 0 01-6.125-2.175" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.75 7.5 7.5 4.5 12 4.5c2.01 0 3.89.57 5.44 1.56" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-8 rounded-xl shadow transition duration-150"
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleForgot}
              disabled={sending}
              className="text-indigo-600 hover:underline text-sm disabled:opacity-50"
            >
              {sending ? "Sending…" : "Forgot password?"}
            </button>
          </div>
        </form>
        <hr className="w-full my-6 border-gray-300 dark:border-neutral-700" />
        <p className="text-center text-gray-700 dark:text-gray-300">
          Don&apos;t have an account? Go to{" "}
          <Link
            className="text-indigo-600 hover:underline font-semibold"
            href="/register"
          >
            Register
          </Link>{" "}
          Page
        </p>
      </div>
    </div>
  );
}

export default Login;
