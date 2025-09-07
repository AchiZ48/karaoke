"use client"
import Image from "next/image";
import Navbar from "./components/Navbar";
import { useSession } from "next-auth/react";

export default function Home() {
  const {data: session} = useSession();

  return (
    <main>
      <Navbar session={session}/>
      <div className="container mx-auto bg">
        <h3 className="text-9xl">Ready to Sing?</h3>
      </div>
    </main>
  );
}
