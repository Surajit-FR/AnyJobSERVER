import { Request, Response } from "express";
import { sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import WalletModel from "../models/wallet.model";
import { CustomRequest } from "../../types/commonType";

export const fetchWalletBalance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const walletDetails = await WalletModel.aggregate([
        {
            $match: {
                userId: req.user?._id
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userDetails"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userDetails"
            }
        },
        {
            $addFields: {
                userName: {
                    $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"]
                },
            }
        },
        {
            $project: {
                _id: 1,
                userName: 1,
                balance: 1,
                currency: 1,
                createdAt: 1,
                updatedAt: 1,
            }
        }
    ])

    return sendSuccessResponse(res, 200, walletDetails, "Wallet balance fetched successfully")
});


export const fetchTransaction = asyncHandler(async (req: CustomRequest, res: Response) => {
    const walletDetails = await WalletModel.aggregate([
        {
            $match: {
                userId: req.user?._id
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userDetails"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userDetails"
            }
        },
        {
            $addFields: {
                userName: {
                    $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"]
                },
            }
        },
        {
            $project: {
                _id: 1,
                userName: 1,
                balance: 1,
                'transactions.type': 1,
                'transactions.amount': 1,
                'transactions.description': 1,
                'transactions.date': 1,
                'transactions._id': 1,
                currency: 1,
                createdAt: 1,
                updatedAt: 1,
            }
        }
    ])

    return sendSuccessResponse(res, 200, walletDetails, "Wallet balance fetched successfully")
});
