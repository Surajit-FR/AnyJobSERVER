"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const notification_model_1 = require("../models/notification.model");
exports.getNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const results = yield notification_model_1.NotificationModel.aggregate([
        {
            $match: {
                receiverId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "senderId",
                as: "senderDetails"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$senderDetails"
            }
        },
        {
            $addFields: {
                senderAvatar: "$senderDetails.avatar"
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                createdAt: 1,
                senderAvatar: 1,
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Notifications retrieved successfully.");
}));
