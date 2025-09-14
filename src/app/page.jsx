"use client"
import { useSession } from "next-auth/react";
import RoomCards from "./components/RoomCards";

export default function Home() {
  const {data: session} = useSession();

  return (
    <main className="bg-purple-300 dark:bg-neutral-900 dark:text-white">
      {/* Landing Section */}
      <section id="landing" className="bg-gradient-to-b from-purple-300 via-purple-300 to-indigo-500 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 min-h-screen flex items- justify-center">
        <div className="container mx-auto px-4 text-center pt-40">
          <h3 className="text-5xl sm:text-7xl md:text-8xl font-bold py-2"> Ready to Sing?</h3>
          <h4 className="text-l sm:text-2xl md:text-3xl font-bold py-2">Login to reserve your perfect room today.</h4>
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
