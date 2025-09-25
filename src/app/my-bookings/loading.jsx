export default function Loading() {
  return (
    <main className="min-h-screen bg-white py-16">
      <div className="container mx-auto p-4 max-w-5xl mt-5">
        {/* Welcome Box */}
        <div className="rounded-2xl mb-8 p-8 bg-gradient-to-r from-[#6768AB] to-[#210535] shadow-lg text-white py-17">
          <h2 className="text-2xl font-semibold mb-2">Welcome back</h2>
          <div className="opacity-80">Manage you bookings and account</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Total</div>
            <div className="text-2xl font-bold"></div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Pending</div>
            <div className="text-2xl font-bold"></div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6768AB] to-[#210535] shadow text-white flex flex-col items-center">
            <div className="text-sm opacity-80">Complete</div>
            <div className="text-2xl font-bold"></div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto">
          <div className="rounded-2xl bg-gradient-to-r from-[#6768AB] to-[#210535] shadow-lg text-white">
            <div className="px-6 pt-6 pb-2 text-lg font-semibold">
              My Bookings
            </div>
            <table className="w-full text-sm rounded-2xl">
              <thead className="bg-white/10 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">BookingID</th>
                  <th className="px-4 py-3 text-left font-medium">Room</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
