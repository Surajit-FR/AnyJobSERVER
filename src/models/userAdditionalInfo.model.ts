import mongoose, { Schema, Model } from "mongoose";
import { IAdditionalUserInfo } from "../../types/schemaTypes";

// Additional Info Schema
const AdditionalUserInfoSchema: Schema<IAdditionalUserInfo> = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, require: true },
    companyName: { type: String, default: "", required: true },
    companyIntroduction: { type: String, default: "", },
    DOB: { type: Date },
    driverLicense: { type: String, default: "", },
    driverLicenseImage: { type: String, default: "", },
    EIN: { type: String, default: "", },
    socialSecurity: { type: String, default: "", },
    companyLicense: { type: String, default: "", },
    companyLicenseImage: { type: String, default: "", },
    insurancePolicy: { type: Number, },
    licenseProofImage: { type: String, default: "", },
    businessLicenseImage: { type: String, default: "", },
    businessImage: { type: String, default: "", },
    businessName: { type: String, default: "", },
    isReadAggrement: { type: Boolean, default: false },
    isAnyArrivalFee: { type: Boolean, default: false },
    arrivalFee: { type: Number },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const AdditionalInfoModel: Model<IAdditionalUserInfo> = mongoose.model<IAdditionalUserInfo>("AdditionalInfo", AdditionalUserInfoSchema);
export default AdditionalInfoModel;