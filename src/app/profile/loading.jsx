export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f8fa]">
      <div
        className="w-full mx-auto max-w-xl rounded-2xl shadow-lg bg-[#f3f3f5] p-8 relative "
        style={{ boxShadow: "4px 8px 16px #e0e0e0" }}
      >
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
            {/* Profile image placeholder */}
            <svg
              width="48"
              height="48"
              fill="none"
              viewBox="0 0 24 24"
              className="text-gray-400"
            >
              <circle cx="12" cy="8" r="4" fill="#e0e0e0" />
              <rect x="4" y="16" width="16" height="6" rx="3" fill="#e0e0e0" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-black">-</div>
            <div className="text-base text-gray-600">-</div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="divide-y divide-gray-300 bg-white rounded-xl overflow-hidden">
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Name</div>
            <div className="flex-1 text-gray-600">-</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Email account</div>
            <div className="flex-1 text-gray-600">-</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Phone number</div>
            <div className="flex-1 text-gray-600">-</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Password</div>
            <div className="flex-1 flex flex-col items-end">
              <span className="tracking-widest text-lg text-gray-600">
                **********
              </span>
              <button className="text-xs text-[#5b5b8c] underline mt-1">
                Change password ?
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
