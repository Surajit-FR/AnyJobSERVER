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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPermissions = exports.givePermission = void 0;
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const permission_model_1 = __importDefault(require("../models/permission.model"));
const teams_model_1 = __importDefault(require("../models/teams.model"));
exports.givePermission = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId, acceptRequest, assignJob, fieldAgentManagement } = req.body;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    // Check if the user exists in the service provider's team
    const team = yield teams_model_1.default.findOne({
        serviceProviderId,
        fieldAgentIds: { $in: [userId] } // Make sure userId is an array for $in
    });
    if (!team) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Agent not found in the service provider's team."));
    }
    // Create or update permissions for the user
    const updatedPermissions = yield permission_model_1.default.findOneAndUpdate({ userId }, // Find by userId
    {
        serviceProviderId,
        userId,
        acceptRequest,
        assignJob,
        fieldAgentManagement
    }, { new: true, upsert: true });
    if (!updatedPermissions) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Failed to create or update permissions."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, updatedPermissions, "Permissions added successfully.");
}));
exports.getUserPermissions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "10", query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = query
        ? {
            $or: [
                { "userId.firstName": { $regex: query, $options: "i" } },
                { "userId.lastName": { $regex: query, $options: "i" } },
            ]
        }
        : {};
    const validSortBy = sortBy || 'createdAt';
    const validSortType = sortType.toLowerCase() === 'desc' ? -1 : 1;
    const sortCriteria = { [validSortBy]: validSortType };
    const permissions = yield permission_model_1.default.aggregate([
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userId"
            }
        },
        { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
        { $match: searchQuery },
        {
            $project: {
                'userId.isDeleted': 0,
                'userId.updatedAt': 0,
                'userId.createdAt': 0,
                "userId.__v": 0,
                "userId.email": 0,
                "userId.phone": 0,
                "userId.password": 0,
                "userId.avatar": 0,
                "userId.isVerified": 0,
                "userId.refreshToken": 0,
                isDeleted: 0,
                updatedAt: 0,
                createdAt: 0,
                __v: 0,
            }
        },
        { $sort: sortCriteria },
        { $skip: skip },
        { $limit: limitNumber }
    ]);
    const totalRecords = yield permission_model_1.default.countDocuments({ isDeleted: false });
    const totalPages = Math.ceil(totalRecords / limitNumber);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        permissions,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            totalPages,
        }
    }, "Permissions retrieved successfully.");
}));
