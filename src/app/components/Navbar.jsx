"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useMemo } from "react";
import Image from "next/image";

export default function Navbar() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  // เมนูตามเงื่อนไขที่มึงต้องการ
  const items = useMemo(() => {
    // 1) ยังไม่ล็อกอิน (!session)
    if (status !== "loading" && !session) {
      return [
        { href: "/#landing", label: "Home" },
        { href: "/#rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/login", label: "Log in" },
        { href: "/register", label: "Register" },
      ];
    }

    // 2) ล็อกอินแล้ว แต่ role !== admin
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

    // 3) ล็อกอินแล้ว และ role === admin
    if (session && role === "admin") {
      return [
        { href: "/#landing", label: "Home" },
        { href: "/#rooms", label: "Room" },
        { href: "/promotions", label: "Promotions" },
        { href: "/booking", label: "Booking" },
        { href: "/admin", label: "Admin Panel" },
        { href: "/profile", label: "Profile" },
        {
          action: () => signOut(),
          label: "Log out",
          button: true,
          variant: "danger",
        },
      ];
    }

    // ระหว่างโหลด
    return [
      { href: "/#landing", label: "Home" },
      { href: "/#rooms", label: "Room" },
      { href: "/promotions", label: "Promotions" },
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Register" },
    ];
  }, [session, status, role]);

  return (
    <nav className="backdrop-blur-md fixed inset-x-0 top-0 bg-indigo-500/70 dark:bg-neutral-900/70 text-white z-50 max-h-20 py-4">
      <div className="max-w-screen-2xl flex justify-between items-center mx-auto my-0 px-8  [container-type:inline-size]">
        <Link
          href="/#landing"
          className="text-[1.75rem] font-bold cursor-pointer flex items-center gap-2"
        >
          <img
            src="/logo2.svg"
            alt="BornToSing"
            className="h-8 sm:h-10 md:h-12 w-auto shrink-0"
          ></img>
          BornToSing
        </Link>
        <div className=" gap-8 items-center hidden [@container(min-width:850px)]:flex">
          <ul className="flex flex-wrap gap-2 align-middle">
            {items.map((it, i) => (
              <li key={i}>
                {it.button ? (
                  <button
                    onClick={it.action}
                    className={`  ${
                      it.variant === "danger"
                        ? "inline-flex items-center rounded-full px-3 py-2 text-sm md:text-base font-bold bg-red-400 text-orange-100 shadow-[0_4px_0_0_theme(colors.violet.900)] transition-[transform,box-shadow] duration-150 ease-out hover:translate-y-0.5 hover:shadow-[0_1px_0_0_theme(colors.violet.900)] active:translate-y-1 active:shadow-[0_0px_0_0_theme(colors.violet.900)] "
                        : "bg-gray-600 border-gray-600 hover:opacity-90"
                    }`}
                  >
                    {it.label}
                  </button>
                ) : it.disabled ? (
                  <span className="py-2 bg-red-500 px-3 opacity-70">
                    {it.label}
                  </span>
                ) : (
                  <Link
                    href={it.href}
                    className="inline-flex items-center rounded-full px-3 py-2 min-h-10 min-w-10 text-sm 
                    md:text-base font-bold bg-orange-100 text-violet-900
                    shadow-[0_4px_0_0_theme(colors.violet.900)]
                    transition-[transform,box-shadow] duration-150 ease-out
                    hover:translate-y-0.5 hover:shadow-[0_1px_0_0_theme(colors.violet.900)]
                    active:translate-y-1 active:shadow-[0_0px_0_0_theme(colors.violet.900)]"
                  >
                    {it.label}
                    {it.icon}
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
