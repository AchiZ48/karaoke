"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useMemo } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  // เมนูตามเงื่อนไขที่มึงต้องการ
  const items = useMemo(() => {
    // 1) ยังไม่ล็อกอิน (!session)
    if (status !== "loading" && !session) {
      return [
        { href: "/", label: "Home" },
        { href: "/rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/login", label: "Log in" },
        { href: "/register", label: "Register" },
      ];
    }

    // 2) ล็อกอินแล้ว แต่ role !== admin
    if (session && role !== "admin") {
      return [
        { href: "/", label: "Home" },
        { href: "/rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/booking", label: "Booking" },
        { href: "/my-bookings", label: "My Booking" },
        { action: () => signOut(), label: "Log out", button: true, variant: "danger" },
      ];
    }

    // 3) ล็อกอินแล้ว และ role === admin
    if (session && role === "admin") {
      return [
        { href: "/", label: "Home" },
        { href: "/rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/booking", label: "Booking" },
        { href: "/admin", label: "Admin Panel" },
        { action: () => signOut(), label: "Log out", button: true, variant: "danger" },
      ];
    }

    // ระหว่างโหลด
    return [{ label: "Loading...", disabled: true }];
  }, [session, status, role]);

  return (
    <nav className="bg-black text-white">
      <div className="container mx-auto px-3 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="font-semibold">
            BorntoSing
          </Link>

          <ul className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <li key={i}>
                {it.button ? (
                  <button
                    onClick={it.action}
                    className={`py-2 px-3 rounded-md text-sm md:text-base border ${
                      it.variant === "danger"
                        ? "bg-red-500 border-red-500 hover:opacity-90"
                        : "bg-gray-600 border-gray-600 hover:opacity-90"
                    }`}
                  >
                    {it.label}
                  </button>
                ) : it.disabled ? (
                  <span className="py-2 px-3 opacity-70">{it.label}</span>
                ) : (
                  <Link
                    href={it.href}
                    className="py-2 px-3 rounded-md text-sm md:text-base hover:bg-white/10"
                  >
                    {it.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
