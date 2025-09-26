"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Additional Info Schema
const AdditionalUserInfoSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, require: true },
    companyName: { type: String, default: "", required: true },
    companyIntroduction: { type: String, default: "", },
    driverLicense: { type: String, default: "", },
    driverLicenseImages: { type: [String], default: [] },
    EIN: { type: String, default: "", },
    socialSecurity: { type: String, default: "", },
    companyLicense: { type: String, default: "", },
    companyLicenseImage: { type: String, default: "", },
    insurancePolicy: { type: String, },
    licenseProofImage: { type: String, default: "", },
    businessLicenseImage: { type: String, default: "", },
    businessImage: { type: String, default: "", },
    businessName: { type: String, default: "", },
    routing_number: { type: String, default: "", },
    account_number: { type: String, default: "", },
    account_holder_name: { type: String, default: "", },
    account_holder_type: { type: String, default: "", },
    isReadAggrement: { type: Boolean, default: false },
    isAnyArrivalFee: { type: Boolean, default: false },
    arrivalFee: { type: Number },
    totalYearExperience: { type: Number, require: [true, "Total Year of Experience is Required."] },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
const AdditionalInfoModel = mongoose_1.default.model("additionalInfo", AdditionalUserInfoSchema);
exports.default = AdditionalInfoModel;
