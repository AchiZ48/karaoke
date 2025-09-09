// models/room.js
import mongoose, { Schema, models, model } from "mongoose";

const roomSchema = new Schema(
  {
    name:    { type: String, required: true, trim: true },
    number:  { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      set: v => (v ? String(v).toUpperCase() : v), // บังคับเป็นพิมพ์ใหญ่ให้สม่ำเสมอ
    },
    type:    { 
      type: String, 
      required: true, 
      enum: ["STANDARD","PREMIUM","DELUXE","VIP"], 
      index: true 
    },
    capacity:{ type: Number, required: true, min: 1 },
    price:   { type: Number, required: true, min: 0 },
    status:  { 
      type: String, 
      enum: ["AVAILABLE","OCCUPIED","MAINTENANCE"], 
      default: "AVAILABLE",
      index: true
    },
    // ตัวเลือกเสริม:
    // notes:   { type: String, trim: true },
    // features:{ type: [String], default: [] },
  },
  { timestamps: true }
);

// ดัชนีเสริมสำหรับกรองบ่อย ๆ (เช่น ดูห้องว่างตามประเภท)
roomSchema.index({ type: 1, status: 1 });
roomSchema.index({ price: 1 });

export default models.Room || model("Room", roomSchema);
