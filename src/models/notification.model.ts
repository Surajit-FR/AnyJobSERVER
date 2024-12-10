import mongoose, { Schema, model } from "mongoose";
import { INotificationSchema } from "../../types/schemaTypes";

const NotificationSchema = new Schema<INotificationSchema>(
    {
        recipientId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, required: true },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const NotificationModel = model<INotificationSchema>("Notification", NotificationSchema);
