import mongoose, { Schema, model } from "mongoose";

const IPLogSchema = new Schema({
    ipAddress: {
        type: String,
        required: true,
    },
    country: {
        type: String,
    },
    region: {
        type: String,
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    userAgent: {
        type: String,
    },  
    route: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, },
    userType: { type: String, },
    timestamp: {
        type: Date,
        default: Date.now
    },
});

const IPLog = model("IPLog", IPLogSchema);

export default IPLog;
