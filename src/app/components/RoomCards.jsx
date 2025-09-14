"use client";
import { useEffect, useState } from "react";

export default function RoomCards() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/rooms");
        const data = await res.json();
        setRooms(data.rooms || []);
      } catch (e) {
        setError("Failed to load rooms");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading rooms...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {rooms.map((r) => (
        <div key={r.number} className="border rounded p-4">
          <div className="font-medium">{r.name}</div>
          <div className="text-sm opacity-70">Type: {r.type}</div>
          <div className="text-sm">Capacity: {r.capacity}</div>
          <div className="text-sm">Price: {r.price} THB</div>
          <div className="text-xs mt-1 opacity-70">Status: {r.status}</div>
        </div>
      ))}
      {rooms.length === 0 && <div>No rooms available.</div>}
    </div>
  );
}

