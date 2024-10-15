import mongoose, { Schema, Model } from "mongoose";
import { IOTPSchema } from "../../types/schemaTypes";
import { string } from "joi";

const otpSchema: Schema<IOTPSchema> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    phoneNumber:{
        type:String,
        required:true
    },
    otp: {
        type: Number,
        unique:true,
        required: true,
    },   
    expiredAt: {
        type: Date,
        required: true,
        index: { expires: '5m' }
    },

}, { timestamps: true });

const OTPModel: Model<IOTPSchema> = mongoose.model<IOTPSchema>('OTP', otpSchema);
export default OTPModel;
