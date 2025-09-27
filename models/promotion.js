// models/promotion.js
import mongoose, { Schema, models, model } from "mongoose";

const promotionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    discountType: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export default models.Promotion || model("Promotion", promotionSchema);

