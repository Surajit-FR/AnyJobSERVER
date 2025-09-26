"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const IPLogSchema = new mongoose_1.Schema({
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
    // timezone: {
    //     type: String,
    //     required: true,
    // },
    // version: {
    //     type: String,
    //     enum: ["IPv4", "IPv6", "Unknown"],
    //     required: true
    // },
    route: { type: String, },
    userId: { type: mongoose_1.Schema.Types.ObjectId, },
    userType: { type: String, },
    timestamp: {
        type: Date,
        default: Date.now
    },
});
const IPLog = (0, mongoose_1.model)("IPLog", IPLogSchema);
exports.default = IPLog;
