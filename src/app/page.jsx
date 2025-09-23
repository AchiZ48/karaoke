"use client";
import { useSession, signIn } from "next-auth/react";
import RoomCards from "./components/RoomCards";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="bg-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-[#7b7bbd] to-[#2d184a] py-6 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <span className="mr-2">🎤</span> Borntosing
        </div>
        <nav className="flex items-center gap-6">
          <a href="#" className="text-white font-medium hover:underline">Home</a>
          <a href="#rooms" className="text-white font-medium hover:underline">Room</a>
          <a href="#" className="text-white font-medium hover:underline">Promotions</a>
          <button
            className="ml-6 px-5 py-2 bg-white text-[#2d184a] rounded font-semibold shadow hover:bg-gray-100 transition"
            onClick={() => signIn()}
          >
            Login
          </button>
          <button className="px-5 py-2 bg-white text-[#2d184a] rounded font-semibold shadow hover:bg-gray-100 transition">
            Register
          </button>
        </nav>
      </header>

      {/* Landing Section */}
      <section className="flex flex-col items-center justify-center py-20">
        <h1 className="text-5xl md:text-6xl font-bold text-center mb-4 text-[#2d184a]">
          Ready to <span className="text-[#7b7bbd]">Sing</span> ?
        </h1>
        <p className="text-lg md:text-xl text-center mb-6 text-[#222]">
          Login to reserve your perfect room today
        </p>
        {!session && (
          <button
            className="px-8 py-2 bg-[#7b7bbd] text-white rounded-lg font-semibold shadow hover:bg-[#2d184a] transition mb-8"
            onClick={() => signIn()}
          >
            Login
          </button>
        )}

        {/* Promotion Box */}
        <div className="w-full max-w-3xl rounded-2xl shadow-lg bg-gradient-to-r from-[#7b7bbd] to-[#2d184a] text-white p-8 mt-4 mb-8 flex flex-col items-start">
          <h2 className="text-2xl font-bold mb-2">Special Promotion This Month !</h2>
          <p className="mb-4">Get 20% off on all VIP rooms with code :</p>
          <span className="bg-white text-[#2d184a] px-6 py-2 rounded-lg font-bold text-lg shadow">
            SING2025
          </span>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="w-full py-16 border-t">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#2d184a] mb-10">
            Our room
          </h2>
          <RoomCards />
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-r from-[#7b7bbd] to-[#2d184a] text-white py-12 mt-auto">
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

