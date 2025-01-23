import mongoose, { Schema, model } from "mongoose";

const IPLogSchema = new Schema({
    ipAddress: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    region: {
        type: String,
        required: true,
    },
    latitude: {
        type: String,
        required: true,
    },
    longitude: {
        type: String,
        required: true,
    },
    // timezone: {
    //     type: String,
    //     required: true,
    // },
    // version: {
    //     type: String,
    //     enum: ["IPv4", "IPv6", "Unknown"],
    //     required: true
    // },
    route: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, },
    userType: { type: String, },
    timestamp: {
        type: Date,
        default: Date.now
    },
    userAgent:{type: String}
});

const IPLog = model("IPLog", IPLogSchema);

export default IPLog;
