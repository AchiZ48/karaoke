"use client";
import { useSession } from "next-auth/react";
import RoomCards from "./components/RoomCards";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="bg-purple-300 dark:bg-violet-600 dark:text-white">
  {/* Hero Section ใหม่จาก Figma */}
  <section className="bg-gradient-to-b from-purple-300 via-purple-300 to-indigo-500 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 min-h-screen flex items-center justify-center">
    <div className="container mx-auto px-4 text-center pt-40">
      <h3 className="text-5xl sm:text-7xl md:text-8xl font-bold py-2 text-white">
        Ready to Sing?
      </h3>
      <h4 className="text-lg sm:text-2xl md:text-3xl font-bold py-2 text-white">
        Login to reserve your perfect room today.
      </h4>
      <button className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700">
        Join Now
      </button>
    </div>
  </section>

      {/* Rooms Section */}
      <section id="rooms" className="min-h-screen">
        <div className="container mx-auto px-4 py-28">
          <h2 className="text-2xl font-semibold mb-6">Rooms</h2>
          <RoomCards />
        </div>
      </section>*/
    </main>
  );
}


