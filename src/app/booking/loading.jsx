export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white py-16 animate-pulse">
      <div className="flex justify-center items-center w-full py-10 px-2">
        <div className="w-full max-w-xl rounded-3xl shadow-2xl bg-gradient-to-b from-[#7b7bbd]  to-[#2A2A45] p-8 border border-white/10 relative">
          <h1 className="text-2xl font-semibold text-white text-center mb-6">
            Book a Room
          </h1>
          <form className="space-y-5">
            {/* Room */}
            <div>
              <label className="block mb-2 text-white font-medium">Room</label>
              <div className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"></div>
            </div>
            {/* Date */}
            <div>
              <label className="block mb-2 text-white font-medium">Date</label>
              <div className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium animate-pulse" />
            </div>
            {/* Time Slot */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Time Slot
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2"></div>
            </div>
            {/* Number of People */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Number of People
              </label>
              <input
                type="number"
                className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium"
                placeholder="Enter number of people"
              />
            </div>
            {/* Promotion */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Promotion
              </label>
              <select className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium">
                <option value="">No promotion</option>
              </select>
            </div>
            {/* Payment Method */}
            <div>
              <label className="block mb-2 text-white font-medium">
                Payment Method
              </label>
              <select className="w-full rounded-xl px-4 py-3 bg-white/90 text-black font-medium">
                <option value="PROMPTPAY">PromptPay</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            {/* Total */}
            {/* Buttons */}
            <div className="flex justify-between gap-4 pt-2">
              <button
                type="button"
                className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#6768AB] text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-[#5a338c] transition"
              >
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
