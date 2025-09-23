import { connectMongoDB } from "../../../lib/mongodb";
import Promotion from "../../../models/promotion";

export default async function PromotionsPage() {
  await connectMongoDB();
  const now = new Date();
  const promos = await Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="bg-white min-h-screen">
      <div className="container mx-auto py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-10">
          <span className="text-[#23235B]">Active </span>
          <span className="text-[#5B5B8C]">Promotions</span>
        </h1>
        <div className="flex flex-col gap-8">
          {promos.map((p) => (
            <div
              key={p._id}
              className="rounded-2xl shadow-lg px-8 py-6 bg-gradient-to-br from-[#6C63FF] to-[#3F326F] text-white"
            >
              <div className="text-lg font-bold mb-2">{p.name} !</div>
              <div className="text-sm mb-4 flex items-center gap-2 flex-wrap">
                {p.description
                  ? p.description
                  : p.discountType === "PERCENT"
                  ? `Get ${p.discountValue}% off`
                  : `Get ${p.discountValue} THB off`}
                <span className="opacity-80">with code :</span>
              </div>
              <button
                className="bg-white text-[#3F326F] font-semibold px-5 py-2 rounded-lg shadow mt-2 text-base"
                style={{ letterSpacing: 1 }}
                disabled
              >
                {p.code}
              </button>
              <div className="text-xs opacity-80 mt-4">
                Valid: {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
              </div>
            </div>
          ))}
          {promos.length === 0 && (
            <div className="opacity-70 text-center">No active promotions.</div>
          )}
        </div>
      </div>
    </main>
  );
}