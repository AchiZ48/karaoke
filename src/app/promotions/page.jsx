import { connectMongoDB } from "../../../lib/mongodb";
import Promotion from "../../../models/promotion";

export default async function PromotionsPage() {
  await connectMongoDB();
  const now = new Date();
  const promos = await Promotion.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main>
      <div className="container mx-auto p-4 max-w-4xl min-h-screen text-black dark:text-white">
        <h1 className="text-2xl font-semibold mb-4">Promotions</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promos.map((p) => (
            <div key={p._id} className="p-4 border rounded border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm opacity-70">Code: {p.code}</div>
              <div className="text-sm">
                {p.discountType === 'PERCENT' ? `${p.discountValue}% off` : `${p.discountValue} THB off`}
              </div>
              <div className="text-xs opacity-60 mt-1">
                Valid: {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
              </div>
            </div>
          ))}
          {promos.length === 0 && (<div className="opacity-70">No active promotions.</div>)}
        </div>
      </div>
    </main>
  );
}
