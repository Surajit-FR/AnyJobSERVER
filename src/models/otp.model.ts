import mongoose, { Schema, Model } from "mongoose";
import { IOTPSchema } from "../../types/schemaTypes";
import { string } from "joi";

const otpSchema: Schema<IOTPSchema> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
    },
    phoneNumber: {
        type: String,
        // required: true
    },
    email:{
        type:String
    },
    otp: {
        type: String,
        unique: true,
        required: true,
    },
    // secret: {
    //     type: String,
    //     required: true
    // },
    expiredAt: {
        type: Date,
        required: true,
        // index: { expires: '0s' }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },

}, { timestamps: true });

const OTPModel: Model<IOTPSchema> = mongoose.model<IOTPSchema>('otp', otpSchema);
export default OTPModel;
