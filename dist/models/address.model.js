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
// Address Schema
const AddressSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, require: true },
    street: { type: String, required: false, default: "" },
    location: { type: String, required: false, default: "" },
    addressType: { type: String, required: false, enum: ["home", "office", "other"], default: "office" },
    city: { type: String, required: false, default: "" },
    state: { type: String, required: false, default: "" },
    country: { type: String, required: false, default: "" },
    zipCode: { type: String, required: [true, "Zipcode is Required"] },
    apartmentNumber: { type: String, default: "" },
    landmark: { type: String, default: "" },
    latitude: { type: String, required: [true, "Latitude is Required"] },
    longitude: { type: String, required: [true, "Longitude is Required"] }
}, { timestamps: true });
const AddressModel = mongoose_1.default.model("address", AddressSchema);
exports.default = AddressModel;
