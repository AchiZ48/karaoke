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
    <div>
      <div className="container mx-auto py-5">
        <h3>Login Page</h3>
        <hr className="my-3" />
        <form onSubmit={handleSubmit}>
          {/* notifications via global toasts */}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block bg-gray-300 p-2 my-2 rounded-md"
            type="email"
            placeholder="your@email.com"
          />
          <input
            onChange={(e) => setPassword(e.target.value)}
            className="block bg-gray-300 p-2 my-2 rounded-md"
            type="password"
            placeholder="Enter your password"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-black p-2 rounded-md text-white"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleForgot}
              disabled={sending}
              className="underline text-sm"
            >
              {sending ? "Sending…" : "Forgot password?"}
            </button>
          </div>
        </form>
        <hr className="my-3" />
        <p>
          Don&apos;t have an account? go to{" "}
          <Link className="text-blue-500 underline" href="/register">
            Register{" "}
          </Link>
          Page
        </p>
      </div>
    </div>
  );
}

export default Login;
