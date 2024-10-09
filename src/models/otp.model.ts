import mongoose, { Schema, Model } from "mongoose";
import { IOTPSchema } from "../../types/schemaTypes";

const otpSchema: Schema<IOTPSchema> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    otp: {
        type: Number
    },   
    expiredAt: {
        type: Date,
    },

}, { timestamps: true });

const OTPModel: Model<IOTPSchema> = mongoose.model<IOTPSchema>('OTP', otpSchema);
export default OTPModel;
