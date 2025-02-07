"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: String, required: true },
    notificationType: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });
exports.NotificationModel = (0, mongoose_1.model)("Notification", NotificationSchema);
