import mongoose, { Schema, Model } from "mongoose";
import { IAddressType } from "../../types/schemaTypes";

// Address Schema
const AddressSchema: Schema<IAddressType> = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, require: true },
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, required: false },
    zipCode: { type: Number, required: [true, "Zipcode is Required"] },
    apartmentNumber: { type: String },
    landmark: { type: String },
    latitude: { type: Number, required: [true, "Latitude is Required"] },
    longitude: { type: Number, required: [true, "Longitude is Required"] }
}, { timestamps: true });

const addressModel: Model<IAddressType> = mongoose.model<IAddressType>("address", AddressSchema);
export default addressModel;
