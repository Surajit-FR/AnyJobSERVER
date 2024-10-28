import { Request, Response } from "express";
import { CustomRequest } from "../../types/commonType";
import ServiceModel from "../models/service.model";
import addressModel from "../models/address.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { IAddServicePayloadReq } from "../../types/requests_responseType";



export const addService = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
        categoryId,
        serviceStartDate,
        serviceShifftId,
        SelectedShiftTime,
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
        serviceShifftId,
        SelectedShiftTime,
        serviceStartDate,
        serviceZipCode,
        serviceLatitude,
        serviceLongitude,
        isIncentiveGiven,
        incentiveAmount,
        answerArray,
        userId: req.user?._id
    });

    if (!newService) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while creating the Service Request."));
    };

    return sendSuccessResponse(res, 201, newService, "Service Request added Successfully");

});

//fetch service request before any service provider accept the request.
export const getPendingServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const results = await ServiceModel.aggregate([
        {
            $match: {
                isApproved: "Pending",
                isReqAcceptedByServiceProvider: false
            }
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

    return sendSuccessResponse(res, 200, results, "Service retrieved successfully.");
});

// updateService controller
export const updateServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const { isApproved }: { isApproved: Boolean } = req.body;
    // console.log(req.params);

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    const updatedService = await ServiceModel.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(serviceId) },
        {
            $set: {
                isApproved,
            }
        }, { new: true }
    );

    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(404, "Service not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedService, "Service Request updated Successfully");
});

export const handleServiceRequestState  = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { serviceId } = req.params;
    const { isReqAcceptedByServiceProvider, requestProgress }: { isReqAcceptedByServiceProvider: boolean, requestProgress: string } = req.body;

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    // Find the current service request details
    const serviceRequest = await ServiceModel.findById(serviceId);

    if (!serviceRequest) {
        return sendErrorResponse(res, new ApiError(404, "Service not found."));
    };

    // Initialize the update object
    const updateData: any = { isReqAcceptedByServiceProvider };

    if (isReqAcceptedByServiceProvider) {
        if (!serviceRequest.isReqAcceptedByServiceProvider) {
            updateData.requestProgress = "Pending";
            updateData.serviceProviderId = req.user?._id;
        } else if (serviceRequest.requestProgress === "Pending" && requestProgress === "Started") {
            updateData.requestProgress = "Started";
        } else if (serviceRequest.requestProgress === "Started" && requestProgress === "Completed") {
            updateData.requestProgress = "Completed";
        }else if ( requestProgress === "Cancelled") {
            updateData.requestProgress = "Cancelled";
            updateData.isReqAcceptedByServiceProvider = false;
            
        }
    };

    const updatedService = await ServiceModel.findByIdAndUpdate(
        serviceId,
        { $set: updateData },
        { new: true }
    );

    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(404, "Service not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedService, "Service Request status updated successfully.");
});



export const deleteService = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    // Remove the Category from the database
    const deletedService = await ServiceModel.findByIdAndUpdate(serviceId, { $set: { isDeleted: true } });

    if (!deletedService) {
        return sendErrorResponse(res, new ApiError(404, "Service  not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Service deleted successfully");
});

// Fetch Service Requests within zipcode range
export const fetchServiceRequest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id as string;
    console.log(userId);

    const user = await addressModel.findOne({ userId }).select('zipCode');
    if (!user || !user.zipCode) {
        return sendErrorResponse(res, new ApiError(400, 'User zipcode not found'));
    }
    // console.log("====");
    const userZipcode = user.zipCode;

    const minZipcode = userZipcode - 10;
    const maxZipcode = userZipcode + 10;

    const serviceRequests = await ServiceModel.find({
        isReqAcceptedByServiceProvider: false,
        serviceZipCode: {
            $gte: minZipcode,
            $lte: maxZipcode
        },
        isDeleted: false
    });

    return sendSuccessResponse(res, 200, serviceRequests, 'Service requests fetched successfully');
});

export const fetchSingleServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    console.log(req.params);

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service request ID is required."));
    };

    const serviceRequestToFetch = await ServiceModel.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose.Types.ObjectId(serviceId)
            }
        }
    ]);

    return sendSuccessResponse(res, 200, serviceRequestToFetch, "Service request retrieved successfully.");

});

// Function to fetch a single service by serviceId
export const fetchAssociatedCustomer = async (serviceId: string) => {
    if (!serviceId) {
        throw new Error("Service request ID is required.");
    }

    const serviceRequest = await ServiceModel.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose.Types.ObjectId(serviceId),
            },
        },
    ]);

    if (!serviceRequest || serviceRequest.length === 0) {
        throw new Error("Service request not found.");
    }

    return serviceRequest[0].userId;
};