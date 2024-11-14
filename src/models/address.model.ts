import mongoose, { Schema, Model } from "mongoose";
import { IAddressType } from "../../types/schemaTypes";

// Address Schema
const AddressSchema: Schema<IAddressType> = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, require: true },
    street: { type: String, required: false, default: "" },
    location: { type: String, required: false, default: "" },
    addressType: { type: String, required: false, enum:["home","office","other"], default: "office" },
    city: { type: String, required: false, default: "" },
    state: { type: String, required: false, default: "" },
    country: { type: String, required: false, default: "" },
    zipCode: { type: Number, required: [true, "Zipcode is Required"] },
    apartmentNumber: { type: String, default: "" },
    landmark: { type: String, default: "" },
    latitude: { type: Number, required: [true, "Latitude is Required"] },
    longitude: { type: Number, required: [true, "Longitude is Required"] }
}, { timestamps: true });

const AddressModel: Model<IAddressType> = mongoose.model<IAddressType>("address", AddressSchema);
export default AddressModel;
