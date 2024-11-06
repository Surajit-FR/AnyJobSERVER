import { Request, Response } from "express";
import { CustomRequest } from "../../types/commonType";
import ServiceModel from "../models/service.model";
import addressModel from "../models/address.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { IAddServicePayloadReq } from "../../types/requests_responseType";


// addService controller
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
        isTipGiven,
        tipAmount,
        answerArray // Expecting answerArray instead of answers
    }: IAddServicePayloadReq = req.body;

    // Validate required fields
    if (!categoryId) return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    if (!serviceStartDate) return sendErrorResponse(res, new ApiError(400, "Service start date is required."));
    if (!serviceShifftId) return sendErrorResponse(res, new ApiError(400, "Service shift ID is required."));
    if (!SelectedShiftTime) return sendErrorResponse(res, new ApiError(400, "Selected shift time is required."));
    if (!serviceZipCode) return sendErrorResponse(res, new ApiError(400, "Service ZIP code is required."));
    if (!serviceLatitude || !serviceLongitude) return sendErrorResponse(res, new ApiError(400, "Service location is required."));
    if (!answerArray || !Array.isArray(answerArray)) return sendErrorResponse(res, new ApiError(400, "Answer array is required and must be an array."));

    // Conditional checks for incentive and tip amounts
    if (isIncentiveGiven && (incentiveAmount === undefined || incentiveAmount <= 0)) {
        return sendErrorResponse(res, new ApiError(400, "Incentive amount must be provided and more than zero if incentive is given."));
    }
    if (isTipGiven && (tipAmount === undefined || tipAmount <= 0)) {
        return sendErrorResponse(res, new ApiError(400, "Tip amount must be provided and more than zero if tip is given."));
    }

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
        isTipGiven,
        tipAmount,
        answerArray,
        userId: req.user?._id
    });

    if (!newService) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while creating the Service Request."));
    };

    return sendSuccessResponse(res, 201, newService, "Service Request added Successfully");
});

// getServiceRequestList controller
export const getServiceRequestList = asyncHandler(async (req: Request, res: Response) => {
    const { page = "1", limit = "10", query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const searchQuery = query
        ? {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { requestProgress: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ]
        }
        : {};

    // Explicitly cast sortBy and sortType to string
    const validSortBy = (sortBy as string) || 'createdAt';
    const validSortType = (sortType as string).toLowerCase() === 'desc' ? -1 : 1;

    const sortCriteria: any = {};
    sortCriteria[validSortBy] = validSortType;

    const results = await ServiceModel.find(searchQuery)
        .populate({
            path: 'userId',
            select: 'firstName lastName email phone'
        })
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNumber)
        .select('-isDeleted -createdAt -updatedAt -__v');

    const totalRecords = await ServiceModel.countDocuments(searchQuery);

    return sendSuccessResponse(res, 200, {
        serviceRequests: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "All Service requests retrieved successfully.");
});

// getPendingServiceRequest controller
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

// handleServiceRequestState controller
export const handleServiceRequestState = asyncHandler(async (req: CustomRequest, res: Response) => {
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
        } else if (requestProgress === "Cancelled") {
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

// deleteService controller
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

// fetchServiceRequest controller
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

// fetchSingleServiceRequest controller
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