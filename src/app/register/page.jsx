"use client";
import React, { useState } from "react";
// Navbar is provided by layout
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useToast } from "../components/toast/ToastProvider";
import { redirect } from "next/navigation";
import { isStrongPassword, PASSWORD_REQUIREMENTS } from "../../../lib/password";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { data: session } = useSession();
  const { showToast } = useToast();
  if (session) {
    redirect("/welcome");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmpassword) {
      setError("Password do not match!");
      showToast("Passwords do not match", "error");
      return;
    }
    if (!name || !email || !password || !confirmpassword || !phone) {
      setError("Please complete all inputs!");
      showToast("Please complete all inputs", "error");
      return;
    }
    if (!isStrongPassword(password)) {
      setError(`Weak password. ${PASSWORD_REQUIREMENTS}.`);
      showToast("Weak password", "error");
      return;
    }
    try {
      const resCheckUser = await fetch("/api/checkUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const { user } = await resCheckUser.json();
      if (user) {
        setError("User already exists!");
        showToast("User already exists", "error");
        return;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
        }),
      });
      if (res.ok) {
        setError("");
        setSuccess("User registration successfully! Logging you in...");
        showToast("Registration successful", "success");
        // Auto sign-in after register
        await signIn("credentials", { email, password, callbackUrl: "/" });
      } else {
        console.log("User registration failed.");
        showToast("Registration failed", "error");
      }
    } catch (error) {
      console.log("Error while registration: ", error);
      showToast("Registration error", "error");
    }
  };
  return (
    <div className="mx-auto justify-center flex py-5 px-2">
      <div className="container p-4 max-w-xl bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-4xl py-5 px-6 text-black dark:text-white ">
        <h3>Register Page</h3>
        <hr className="my-3" />
        <form onSubmit={handleSubmit}>
          {/* notifications via global toasts */}
          <input
            onChange={(e) => setName(e.target.value)}
            className="block p-2 my-2 w-full border-2 border-black rounded-full bg-white text-black"
            type="text"
            placeholder="Enter your name"
          />
          <input
            onChange={(e) => setEmail(e.target.value)}
            className="block p-2 my-2 w-full border-2 border-black rounded-full bg-white text-black"
            type="email"
            placeholder="your@email.com"
          />
          <input
            onChange={(e) => setPassword(e.target.value)}
            className="block p-2 my-2 w-full border-2 border-black rounded-full bg-white text-black"
            type="password"
            placeholder="Enter your password"
          />
          <p className="text-xs opacity-70 -mt-1 mb-2">
            {PASSWORD_REQUIREMENTS}
          </p>
          <input
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block p-2 my-2 w-full border-2 border-black rounded-full bg-white text-black"
            type="password"
            placeholder="Confirm your password"
          />
          <input
            onChange={(e) => setPhone(e.target.value)}
            className="block p-2 my-2 w-full border-2 border-black rounded-full bg-white text-black"
            type="tel"
            placeholder="Phone number"
          />
          <button type="submit" className="bg-black p-2 rounded-full text-white">
            Sign Up
          </button>
          <hr className="my-3" />
          <p>
            Already have an account? go to{" "}
            <Link className="text-blue-500 underline" href="/login">
              Log In{" "}
            </Link>
            Page
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
