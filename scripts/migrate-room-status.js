require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || undefined;

if (!uri) {
  console.error("Missing MONGODB_URI environment variable");
  process.exit(1);
}

const roomSchema = new mongoose.Schema({ status: String }, { strict: false });
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema, "rooms");

const normalizeStatus = (value) => {
  if (!value || typeof value !== "string") return "ACTIVE";
  const upper = value.trim().toUpperCase();
  if (upper === "INACTIVE") return "INACTIVE";
  if (upper === "ACTIVE") return "ACTIVE";
  if (upper === "MAINTENANCE") return "INACTIVE";
  if (upper === "AVAILABLE" || upper === "OCCUPIED") return "ACTIVE";
  return "ACTIVE";
};

async function migrate() {
  await mongoose.connect(uri, { dbName });
  const rooms = await Room.find({}, { status: 1 }).lean();

  if (!rooms.length) {
    console.log("No rooms found; nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const legacyCounts = {};
  const updates = [];

  for (const room of rooms) {
    const current = typeof room.status === "string" ? room.status : null;
    const key = current ?? "<missing>";
    legacyCounts[key] = (legacyCounts[key] || 0) + 1;

    const next = normalizeStatus(current);
    if (next !== current) {
      updates.push({
        updateOne: {
          filter: { _id: room._id },
          update: { $set: { status: next } },
        },
      });
    }
  }

  if (updates.length) {
    const bulkResult = await Room.bulkWrite(updates, { ordered: false });
    console.log(`Updated ${bulkResult.modifiedCount} room(s).`);
  } else {
    console.log("All rooms already use Active/Inactive statuses.");
  }

  console.log("Legacy status counts:");
  console.table(
    Object.entries(legacyCounts).map(([status, count]) => ({ status, count })),
  );

  const finalStatuses = await Room.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log("Final status distribution:");
  console.table(
    finalStatuses.map((row) => ({ status: row._id ?? "<missing>", count: row.count })),
  );

  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Room status migration failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  });