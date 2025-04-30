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
<<<<<<< HEAD
=======
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
>>>>>>> simran
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const notification_model_1 = require("../models/notification.model");
<<<<<<< HEAD
exports.getNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const results = yield notification_model_1.NotificationModel.aggregate([
        {
            $match: {
                receiverId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            }
        },
        {
=======
const teams_model_1 = __importDefault(require("../models/teams.model"));
exports.getNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    var serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    console.log((_b = req.user) === null || _b === void 0 ? void 0 : _b._id);
    if (((_c = req.user) === null || _c === void 0 ? void 0 : _c.userType) === "FieldAgent") {
        const findTeam = yield teams_model_1.default.findOne({
            fieldAgentIds: (_d = req.user) === null || _d === void 0 ? void 0 : _d._id
        });
        if (findTeam) {
            serviceProviderId = findTeam.serviceProviderId;
        }
    }
    ;
    const results = yield notification_model_1.NotificationModel.aggregate([
        {
            $match: {
                receiverId: (_e = req.user) === null || _e === void 0 ? void 0 : _e._id,
            }
        },
        {
            $addFields: { serviceProviderId: serviceProviderId }
        },
        {
>>>>>>> simran
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "senderId",
                as: "senderDetails"
            }
        },
        {
<<<<<<< HEAD
=======
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "serviceProviderId",
                as: "companyDetails"
            }
        },
        {
>>>>>>> simran
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$senderDetails"
            }
        },
        {
<<<<<<< HEAD
            $addFields: {
                senderAvatar: "$senderDetails.avatar"
=======
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$companyDetails"
            }
        },
        {
            $addFields: {
                senderAvatar: "$senderDetails.avatar",
                senderCompanyImage: "$companyDetails.businessImage",
>>>>>>> simran
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                createdAt: 1,
                senderAvatar: 1,
<<<<<<< HEAD
=======
                senderCompanyImage: 1,
>>>>>>> simran
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Notifications retrieved successfully.");
}));
