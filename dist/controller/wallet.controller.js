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
exports.fetchTransaction = exports.fetchWalletBalance = void 0;
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
exports.fetchWalletBalance = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const walletDetails = yield wallet_model_1.default.aggregate([
        {
            $match: {
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userDetails",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userDetails",
            },
        },
        {
            $addFields: {
                userName: {
                    $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                },
            },
        },
        {
            $project: {
                _id: 1,
                userName: 1,
                balance: 1,
                currency: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, walletDetails, "Wallet balance fetched successfully");
}));
exports.fetchTransaction = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const walletDetails = yield wallet_model_1.default.aggregate([
        {
            $match: {
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userDetails",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userDetails",
            },
        },
        {
            $addFields: {
                userName: {
                    $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                },
                transactions: {
                    $map: {
                        input: "$transactions",
                        as: "transaction",
                        in: {
                            _id: "$$transaction.stripeTransactionId",
                            type: "$$transaction.type",
                            amount: "$$transaction.amount",
                            description: "$$transaction.description",
                            date: "$$transaction.date",
                        },
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                userName: 1,
                balance: 1,
                transactions: 1,
                currency: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, walletDetails, "Wallet balance fetched successfully");
}));
