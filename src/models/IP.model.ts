import { Schema, model } from "mongoose";

const IPLogSchema = new Schema({
    ipAddress: {
        type: String,
        required: true,
    },
    ipType: {
        type: String,
        enum: ["IPv4", "IPv6", "Unknown"],
        required: true
    },
    route: { type: String, required: true },
    method: { type: String, required: true },
    protocol: { type: String, required: true },
    hostname: { type: String, required: true },
    queryParams: { type: Schema.Types.Mixed, default: {} },
    headers: {
        type: new Schema({
            contentType: { type: String },
            userAgent: { type: String },
        }),
        default: {},
    },
    referer: { type: String, default: "Direct Access" },
    userId: { type: String, },
    userType: { type: String, },
    timestamp: {
        type: Date,
        default: Date.now
    },
});

const IPLog = model("IPLog", IPLogSchema);

export default IPLog;
