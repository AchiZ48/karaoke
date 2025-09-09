// models/room.js
import mongoose, { Schema, models, model } from "mongoose";

const roomSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    number:   { 
      type: String, required: true, unique: true, trim: true,
      set: v => (v ? String(v).toUpperCase() : v) // บังคับเป็นพิมพ์ใหญ่
    },
    type:     { 
      type: String, required: true, trim: true,
      enum: ["STANDARD", "PREMIUM", "DELUXE", "VIP"], index: true
    },
    capacity: { type: Number, required: true, min: 1 },
    price:    { type: Number, required: true, min: 0 },
    status:   { 
      type: String, enum: ["AVAILABLE","OCCUPIED","MAINTENANCE"], 
      default: "AVAILABLE", index: true 
    },
    // optional:
    // features: { type: [String], default: [] },
    // notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// ดัชนีที่ช่วยค้นหา
roomSchema.index({ type: 1, status: 1 });
roomSchema.index({ price: 1 });

export default models.Room || model("Room", roomSchema);
