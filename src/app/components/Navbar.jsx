"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useMemo } from "react";
import Image from "next/image";

export default function Navbar() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  const items = useMemo(() => {
    if (status !== "loading" && !session) {
      return [
        { href: "/#landing", label: "Home" },
        { href: "/#rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/login", label: "Login", button: true },
        { href: "/register", label: "Register", button: true },
      ];
    }
    if (session && role !== "admin") {
      return [
        { href: "/#landing", label: "Home" },
        { href: "/#rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/booking", label: "Booking" },
        { href: "/my-bookings", label: "My Booking" },
        {
          href: "/profile",
          icon: <img src="/profile.svg" alt="" width={20} />,
        },
        {
          action: () => signOut(),
          label: "Log out",
          button: true,
          variant: "danger",
        },
      ];
    }
    if (session && role === "admin") {
      return [
        { href: "/#landing", label: "Home" },
        { href: "/#rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/booking", label: "Booking" },
        { href: "/admin", label: "Admin Panel" },
        {
          href: "/profile",
          icon: <img src="/profile.svg" alt="" width={20} />,
        },
        {
          action: () => signOut(),
          label: "Log out",
          button: true,
          variant: "danger",
        },
      ];
    }
    return [
      { href: "/#landing", label: "Home" },
      { href: "/#rooms", label: "Room" },
      { href: "/promotions", label: "Promotions" },
      { href: "/login", label: "Login", button: true },
      { href: "/register", label: "Register", button: true },
    ];
  }, [session, status, role]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 max-h-20 py-4 backdrop-blur-md bg-linear-to-r from-[#7B7BCB] to-[#2B0A3D]/90 shadow-[#7B7BCB]/50 shadow-md">
      <div className="max-w-screen-2xl flex justify-between items-center mx-auto px-8">
        <Link
          href="/#landing"
          className="text-[1.75rem] font-bold cursor-pointer flex items-center gap-2 text-white"
        >
          <img
            src="/logo2.svg"
            alt="BornToSing"
            className="h-8 sm:h-10 md:h-12 w-auto shrink-0"
          />
          Borntosing
        </Link>
        <div className="flex gap-8 items-center">
          <ul className="flex gap-8 items-center">
            {items
              .filter((it) => !it.button)
              .map((it, i) => (
                <li key={i}>
                  <Link
                    href={it.href}
                    className="text-white text-base font-medium hover:opacity-80 transition relative inline-block pb-1
                    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                    after:bg-[#7b7bbd] after:transition-all after:duration-300 
                    hover:after:w-full"
                  >
                    {it.label}
                    {it.icon}
                  </Link>
                </li>
              ))}
          </ul>
          <div className="flex gap-4">
            {items
              .filter((it) => it.button)
              .map((it, i) =>
                it.action ? (
                  <button
                    key={i}
                    onClick={it.action}
                    className="bg-white hover:cursor-pointer hover:outline-2 outline-0 outline-offset-2 outline-red-500 text-[#2B0A3D] font-semibold rounded px-5 py-2 shadow hover:bg-gray-100 transition"
                  >
                    {it.label}
                  </button>
                ) : (
                  <Link
                    key={i}
                    href={it.href}
                    className="bg-white text-[#2B0A3D] font-semibold rounded px-5 py-2 shadow hover:bg-[#6768AB] hover:text-white transition"
                  >
                    {it.label}
                  </Link>
                )
              )}
          </div>
        </div>
      </div>
    </nav>
  );
}