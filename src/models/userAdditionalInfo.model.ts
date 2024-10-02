import mongoose, { Schema, Model } from "mongoose";
import { IAdditionalUserInfo } from "../../types/schemaTypes";

// Additional Info Schema
const AdditionalUserInfoSchema: Schema<IAdditionalUserInfo> = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, require: true },
    companyName: { type: String, required: true },
    companyIntroduction: { type: String },
    DOB: { type: Date },
    driverLicense: { type: String },
    driverLicenseImage: { type: String },
    EIN: { type: String },
    socialSecurity: { type: String },
    companyLicense: { type: String },
    companyLicenseImage: { type: String },
    insurancePolicy: { type: Number },
    licenseProofImage: { type: String },
    businessLicenseImage: { type: String },
    businessImage: { type: String },
    businessName: { type: String },
    isReadAggrement: { type: Boolean, default: false },
    isAnyArrivalFee: { type: Boolean, default: false },
    arrivalFee: { type: Number },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const additionalInfoModel: Model<IAdditionalUserInfo> = mongoose.model<IAdditionalUserInfo>("additionalInfo", AdditionalUserInfoSchema);
export default additionalInfoModel;