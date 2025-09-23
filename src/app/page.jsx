"use client";
import { useSession, signIn } from "next-auth/react";
import RoomCards from "./components/RoomCards";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="bg-purple-300 dark:bg-violet-600 dark:text-white min-h-screen">
      {/* Landing Section */}
      <section
        id="landing"
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-300 via-purple-300 to-indigo-500 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800"
      >
        <div className="flex flex-col items-center justify-center gap-8">
          <h3 className="text-5xl sm:text-7xl md:text-8xl font-bold text-center">
            Ready to Sing?
          </h3>
          <h4 className="text-lg sm:text-2xl md:text-3xl font-bold text-center">
            Login to reserve your perfect room today.
          </h4>
          {!session && (
            <button
              className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow-lg hover:bg-indigo-700 transition"
              onClick={() => signIn()}
            >
              Login
            </button>
          )}
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="min-h-screen">
        <div className="container mx-auto px-4 py-28">
          <h2 className="text-2xl font-semibold mb-6">Rooms</h2>
          <RoomCards />
        </div>
      </section>
    </main>
  );
}