"use client";
import { useSession, signIn } from "next-auth/react";
import RoomCards from "./components/RoomCards";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="bg-white dark:bg-neutral-900 dark:text-white min-h-screen flex flex-col">
      {/* Landing Section */}
      <section
        id="landing"
        className="flex flex-col items-center justify-center py-24"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-center text-violet-800 dark:text-white mb-4">
          Ready to <span className="text-indigo-500">Sing</span> ?
        </h1>
        <p className="text-lg md:text-xl text-center mb-6">
          Login to reserve your perfect room today
        </p>
        {!session && (
          <button
            className="px-8 py-2 bg-gradient-to-r from-indigo-500 to-violet-700 text-white rounded-lg font-semibold shadow hover:from-indigo-600 hover:to-violet-800 transition mb-8"
            onClick={() => signIn()}
          >
            Login
          </button>
        )}

        {/* Promotion Box */}
        <div className="w-full max-w-3xl rounded-2xl shadow-lg bg-gradient-to-r from-indigo-400 to-violet-900 text-white p-8 mt-4 mb-8 flex flex-col items-start">
          <h2 className="text-2xl font-bold mb-2">Special Promotion This Month !</h2>
          <p className="mb-4">Get 20% off on all VIP rooms with code :</p>
          <span className="bg-white text-violet-900 px-6 py-2 rounded-lg font-bold text-lg shadow">
            SING2025
          </span>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="w-full py-16 border-t">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-violet-900 dark:text-white mb-10">
            Our room
          </h2>
          <RoomCards />
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-r from-indigo-400 to-violet-900 text-white py-12 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start px-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-2">CONTACT US</h3>
            <p className="flex items-center gap-2 font-semibold">
              <span>🎤</span> Borntosing
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">Location</p>
            <p>
              1518 Pracharat 1 Road, Wongsawang, Bang Sue,<br />
              Bangkok 10800, Thailand.
            </p>
            <p className="font-bold mt-4 mb-1">Open Monday - Sunday:</p>
            <p>10:00 a.m. - 22:00 p.m.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}