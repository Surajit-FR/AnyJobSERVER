import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { NotificationModel } from "../models/notification.model";

export const getNotifications = asyncHandler(async (req: CustomRequest, res: Response) => {

    const results = await NotificationModel.aggregate([
        {
            $match: {
                receiverId:req.user?._id,                
            }
        },
        {
            $lookup:{
                from:"users",
                foreignField:"_id",
                localField:"senderId",
                as:"senderDetails"
            }
        },
        {
            $unwind:{
                preserveNullAndEmptyArrays:true,
                path:"$senderDetails"
            }
        },
        {
            $addFields:{
                senderAvatar:"$senderDetails.avatar"
            }
        },
        {
            $project:{
                _id:1,
                title:1,
                createdAt:1,
                senderAvatar:1,
            }
        }
    ]);
    return sendSuccessResponse(res, 200, results, "Notifications retrieved successfully.");
});