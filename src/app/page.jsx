"use client";
import { useSession, signIn } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="bg-white min-h-screen flex flex-col">
      {/* Header */}


      {/* Landing Section */}
      <section className="flex flex-col items-center justify-center py-20 min-h-screen ">
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
      <section id="rooms" className="w-full py-16 border-t min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#2d184a] mb-6">
            Our room
          </h2>
          <p className="text-xl font-semibold text-[#2d184a] mb-12">
            เลือกห้องที่เหมาะกับคุณ พร้อมระบบเสียงและบรรยากาศสุดพิเศษสำหรับทุกโอกาส
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Standard Room */}
            <div className="flex flex-col items-center">
              <img
                src="/images/standard-room.jpg"
                alt="Standard Room"
                className="rounded-2xl shadow-lg w-full mb-6 object-cover"
                style={{ maxHeight: 220 }}
              />
              <h3 className="text-2xl font-bold text-[#2d184a] mb-4">Standard Room</h3>
              <ul className="text-[#222] text-lg list-disc pl-5 mb-2">
                <li>เหมาะสำหรับลูกค้ากลุ่มเล็ก รองรับ 1-4 คน</li>
                <li>ระบบเสียงมาตรฐาน คมชัด</li>
                <li>จอขนาดกลางพร้อมไมค์คุณภาพ</li>
                <li>มีทั้งหมด 4 ห้อง</li>
                <li>ราคา 350 บาท/ชั่วโมง</li>
              </ul>
            </div>
            {/* Premium Room */}
            <div className="flex flex-col items-center">
              <img
                src="/images/premium-room.jpg"
                alt="Premium Room"
                className="rounded-2xl shadow-lg w-full mb-6 object-cover"
                style={{ maxHeight: 220 }}
              />
              <h3 className="text-2xl font-bold text-[#2d184a] mb-4">Premium Room</h3>
              <ul className="text-[#222] text-lg list-disc pl-5 mb-2">
                <li>เหมาะสำหรับลูกค้ากลุ่มขนาดกลาง รองรับ 4-8 คน</li>
                <li>จอขนาดใหญ่ Full + ระบบเสียงรอบทิศทาง</li>
                <li>รองรับปาร์ตี้และการร้องแบบจัดเต็ม</li>
                <li>มีทั้งหมด 4 ห้อง</li>
                <li>ราคา 580 บาท/ชั่วโมง</li>
              </ul>
            </div>
            {/* VIP Room */}
            <div className="flex flex-col items-center">
              <img
                src="/images/vip-room.jpg"
                alt="VIP Room"
                className="rounded-2xl shadow-lg w-full mb-6 object-cover"
                style={{ maxHeight: 220 }}
              />
              <h3 className="text-2xl font-bold text-[#2d184a] mb-4">VIP Room</h3>
              <ul className="text-[#222] text-lg list-disc pl-5 mb-2">
                <li>เหมาะสำหรับลูกค้ากลุ่มใหญ่ รองรับ 8-15 คน</li>
                <li>จอขนาดใหญ่ Full + ระบบเสียง Hi-end</li>
                <li>บริการพิเศษ : Private waiter / room service</li>
                <li>เหมาะสำหรับงานเลี้ยง วันเกิด หรือปาร์ตี้สุด Exclusive</li>
                <li>มีทั้งหมด 2 ห้อง</li>
                <li>ราคา 1200 บาท/ชั่วโมง</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      
    </main>
  );
}

/*bg-red-500*/