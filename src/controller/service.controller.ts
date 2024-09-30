import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import ServiceModel from "../models/service.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { sendSMS } from "../utils/twilio";
import { IAddServicePayloadReq } from "../../types/requests_responseType";



export const addService = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
        categoryId,
        subCategoryId,
        serviceStartDate,
        serviceShift,
        shiftTime,
        serviceZipCode,
        serviceLatitude,
        serviceLongitude,
        isIncentiveGiven,
        incentiveAmount,
        userId,
        answerArray // Expecting answerArray instead of answers
    }: IAddServicePayloadReq = req.body;

    // Prepare the new service object
    const newService = await ServiceModel.create({
        categoryId,
        subCategoryId,
        serviceStartDate,
        serviceShift, // Fixed typo: from serviceShifft to serviceShift
        shiftTime,
        serviceZipCode,
        serviceLatitude,
        serviceLongitude,
        isIncentiveGiven,
        incentiveAmount,
        answerArray, // Set answerArray in the new service
        userId: req.user?._id // Ensure userId is taken from the authenticated user
    });

    if (!newService) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while creating the Service Request."));
    };

    return sendSuccessResponse(res, 201, newService, "Service Request added Successfully");
});

export const getPendingServiceRequest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const results = await ServiceModel.aggregate([
        {
            $match: { isApproved: "Pending" }
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId"
            }
        },
        {
            $unwind: {
                // preserveNullAndEmptyArrays: true,
                path: "$categoryId"
            }
        },
        {
            $lookup: {
                from: "subcategories",
                foreignField: "_id",
                localField: "subCategoryId",
                as: "subCategoryId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$subCategoryId"
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId"
            }
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                'userId.password': 0,
                'userId.refreshToken': 0,
                'userId.isDeleted': 0,
                'userId.__v': 0,
                'userId.signupType': 0,
                'subCategoryId.isDeleted': 0,
                'subCategoryId.__v': 0,
                // 'categoryId.isDeleted': 0,
                // 'categoryId.__v': 0,


            }
        },
        { $sort: { createdAt: -1 } },
    ]);
    // console.log(results);

    return sendSuccessResponse(res, 200, {
        results,

    }, "Service retrieved successfully.");
});


// updateService controller
export const updateService = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { serviceId } = req.params;
    const { isApproved }: { isApproved: Boolean } = req.body;
    console.log(req.params);


    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    const updatedService = await ServiceModel.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(serviceId) },
        {
            $set: {
                isApproved
            }
        }, { new: true }
    );

    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(404, "Service not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedService, "Service Request updated Successfully");
});

export const deleteService = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { serviceId } = req.params;
    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    // Remove the Category from the database
    const deletedService = await ServiceModel.findByIdAndDelete(serviceId);

    if (!deletedService) {
        return sendErrorResponse(res, new ApiError(404, "Service  not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Service deleted successfully");
});
