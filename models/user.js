import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            required: false,
            default: "user"
        },
        passwordResetTokenHash: {
            type: String,
            required: false,
            default: null,
        },
        passwordResetExpiresAt: {
            type: Date,
            required: false,
            default: null,
        }
    },
    {timestamps: true}
)

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
