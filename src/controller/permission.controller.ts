import { Request, Response } from "express";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import PermissionModel from "../models/permission.model";
import TeamModel from "../models/teams.model";


export const givePermission = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {  userId, acceptRequest, assignJob, fieldAgentManagement } = req.body;
    const serviceProviderId = req.user?._id;

    // Check if the user exists in the service provider's team
    const team = await TeamModel.findOne({
        serviceProviderId,
        fieldAgentIds: { $in: [userId] }  // Make sure userId is an array for $in
    });

    if (!team) {
        return sendErrorResponse(res, new ApiError(404, "Agent not found in the service provider's team."))
    }

    // Create or update permissions for the user
    const updatedPermissions = await PermissionModel.findOneAndUpdate(
        { userId }, // Find by userId
        {
            serviceProviderId,
            userId,
            acceptRequest,
            assignJob,
            fieldAgentManagement
        },
        { new: true, upsert: true } 
    );

    if (!updatedPermissions) {
        return sendErrorResponse(res, new ApiError(500, "Failed to create or update permissions."))
    }


    return sendSuccessResponse(res, 200, updatedPermissions, "Permissions added successfully.")

});

export const getUserPermissions = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { userId } = req.params;

    const permissions = await PermissionModel.findOne({ userId });

    if (!permissions) {
        return sendErrorResponse(res, new ApiError(404, "Permission not found for the user."))
    }

    return sendSuccessResponse(res, 200, permissions, "Permissions retrieved successfully.")

});