"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [open, setOpen] = useState(false);
  const openDrawer = () => setOpen(true);
  const closeDrawer = () => setOpen(false);

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
        ,
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
    <>
      <nav className="fixed inset-x-0 top-0 z-50 max-h-20 py-4 backdrop-blur-md bg-linear-to-r from-[#7B7BCB] to-[#2B0A3D]/90 shadow-[#7B7BCB]/50 shadow-md">
        <div className="max-w-screen-2xl flex justify-between items-center mx-auto px-8 [container-type:inline-size]">
          <Link
            href="/#landing"
            className="text-[1.75rem] font-bold cursor-pointer flex items-center gap-2 text-white"
          >
            <img
              src="/logo2.svg"
              alt="BornToSing"
              className="h-8 sm:h-10 md:h-12 w-auto shrink-0"
            />
            BornToSing
          </Link>
          <div className="flex gap-8 items-center [@container(max-width:900px)]:hidden">
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
            {session ? (
              <Link href="/profile">
                <img src="/profile.svg" alt="" width={20} height={20} />
              </Link>
            ) : (
              ""
            )}
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
                  ),
                )}
            </div>
          </div>
          <button
            onClick={openDrawer}
            className="[@container(min-width:900px)]:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-white/30 text-white hover:bg-white/10 transition"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>
      {/* Drawer */}
      <div
        className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute bg-black/50 backdrop-blur-md inset-0 min-h-screen transition-opacity duration-300
                ${open ? "opacity-100" : "opacity-0"}`}
          onClick={closeDrawer}
        />
        {/* Panel */}
        <div
          className={`
                transform backdrop-blur-md transition-transform duration-300 ease-out
                ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* เนื้อหาเมนู */}
          <div className="px-6 py-6 h-screen justify-items-center flex items-center justify-center">
            <button
              onClick={closeDrawer}
              className="absolute inline-flex top-4 right-10 items-center justify-center w-10 h-10 rounded-md border border-white/30 hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div>
              <ul className="flex flex-col gap-5">
                {items
                  .filter((it) => !it.button)
                  .map((it, i) => (
                    <li key={`m-${i}`}>
                      <Link
                        href={it.href}
                        onClick={closeDrawer}
                        className="block px-3 py-3 rounded-lg text-white text-center text-3xl font-medium hover:opacity-80 transition relative pb-1
                    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                    after:bg-[#7b7bbd] after:transition-all after:duration-300 
                    hover:after:w-full"
                      >
                        <span className="inline-flex items-center gap-3">
                          {it.icon}
                          {it.label}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
              <Link
                        href="/profile"
                        onClick={closeDrawer}
                        className="my-5 block px-3 py-3 rounded-lg text-white text-center text-3xl font-medium hover:opacity-80 transition relative pb-1
                    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                    after:bg-[#7b7bbd] after:transition-all after:duration-300 
                    hover:after:w-full"
                      >
                        <span className="inline-flex items-center gap-3">
                          Profile
                        </span>
                      </Link>
              <div className="mt-6 grid grid-cols-1 gap-3 items-center">
                {items
                  .filter((it) => it.button)
                  .map((it, i) =>
                    it.action ? (
                      <button
                        key={`mb-${i}`}
                        onClick={() => {
                          closeDrawer();
                          it.action?.();
                        }}
                        className="w-full bg-white text-[#2B0A3D] font-semibold rounded-lg px-5 py-3 shadow hover:bg-gray-100 transition"
                      >
                        {it.label}
                      </button>
                    ) : (
                      <Link
                        key={`mb-${i}`}
                        href={it.href}
                        onClick={closeDrawer}
                        className="w-full text-center bg-white text-[#2B0A3D] font-semibold rounded-lg px-5 py-3 shadow hover:bg-[#6768AB] hover:text-white transition"
                      >
                        {it.label}
                      </Link>
                    ),
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
