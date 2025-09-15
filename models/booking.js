// models/booking.js
import mongoose, { Schema, models, model } from "mongoose";

const roomSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["STANDARD", "PREMIUM", "DELUXE", "VIP"],
    },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }, // ไม่ต้องมี _id ใน subdocument
);

const bookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    bookingId: { type: String, required: true, unique: true, trim: true },

    // เก็บข้อมูลห้องแบบ embed (ถ้าจะใช้ roomId แทน ให้เปลี่ยนเป็น: roomId: { type: Schema.Types.ObjectId, ref: "Room" })
    room: { type: roomSubSchema, required: true },

    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    customerPhone: { type: String, required: true, trim: true },

    date: { type: Date, required: true, index: true }, // ใช้ค้นหา/กราฟ
    timeSlot: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/,
        "Invalid timeSlot (HH:MM-HH:MM)",
      ],
    },

    numberOfPeople: { type: Number, required: true, min: 1 },

    status: {
      type: String,
      required: true,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PAID",
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["CASH", "PROMPTPAY", "STRIPE"],
    },

    totalAmount: { type: Number, required: true, min: 0 },
    promotionCode: { type: String, trim: true },
    paymentIntentId: { type: String, index: true },

    // denormalized ไว้ group รายเดือนเร็ว ๆ
    monthKey: { type: String, index: true }, // รูปแบบ "YYYY-MM"
  },
  { timestamps: true },
);

// เติม monthKey อัตโนมัติจาก date
bookingSchema.pre("save", function (next) {
  if (this.date) {
    const y = this.date.getFullYear();
    const m = String(this.date.getMonth() + 1).padStart(2, "0");
    this.monthKey = `${y}-${m}`;
  }
  next();
});

// ดัชนีเสริม (ถ้าต้อง query บ่อย)
bookingSchema.index({ customerEmail: 1 });
bookingSchema.index({ status: 1, date: -1 });

export default models.Booking || model("Booking", bookingSchema);
