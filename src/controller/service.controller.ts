import { Request, Response } from "express";
import { CustomRequest } from "../../types/commonType";
import ServiceModel from "../models/service.model";
import AddressModel from "../models/address.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { IAddServicePayloadReq } from "../../types/requests_responseType";
import PermissionModel from "../models/permission.model";
import TeamModel from "../models/teams.model";
import UserModel from "../models/user.model";


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
        otherInfo,
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

    //strcture location object for geospatial query
    const location = {
        type: "Point",
        coordinates: [serviceLongitude, serviceLatitude] // [longitude, latitude]
    };
    if (!location) return sendErrorResponse(res, new ApiError(400, "Location is required."));


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
        location,
        isIncentiveGiven,
        incentiveAmount,
        isTipGiven,
        tipAmount,
        otherInfo,
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

    const searchQuery = {
        isDeleted: false,
        ...(query && {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { requestProgress: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ]
        })
    };

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
export const getAcceptedServiceRequestInJobQueue = asyncHandler(async (req: CustomRequest, res: Response) => {
    const results = await ServiceModel.aggregate([
        {
            $match: {
                requestProgress: "Pending",
                serviceProviderId: req.user?._id,
                isReqAcceptedByServiceProvider: true
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
                'userId.createdAt': 0,
                'userId.updatedAt': 0,
                'userId.userType': 0,
                'userId.isVerified': 0,
                'userId.__v': 0,
                'userId.signupType': 0,
                'categoryId.isDeleted': 0,
                'categoryId.__v': 0,
                'categoryId.owner': 0,
                'categoryId.createdAt': 0,
                'categoryId.updatedAt': 0,
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
    const userType = req.user?.userType;
    let userId = req.user?._id;
    const { serviceId } = req.params;
    const { isReqAcceptedByServiceProvider, requestProgress }: { isReqAcceptedByServiceProvider: boolean, requestProgress: string } = req.body;

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    }
    const serviceRequest = await ServiceModel.findById(serviceId);
    if (!serviceRequest) {
        return sendErrorResponse(res, new ApiError(404, "Service not found."));
    }

    let serviceProviderId = userId;
    //|| userType === "FieldAgent"
    if (userType === "TeamLead") {
        const permissions = await PermissionModel.findOne({ userId }).select('acceptRequest');
        if (!permissions?.acceptRequest) {
            return sendErrorResponse(res, new ApiError(403, 'Permission denied: Accept Request not granted.'));
        }

        const team = await TeamModel.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return sendErrorResponse(res, new ApiError(404, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    };

    if (userType === "FieldAgent") {

        if (!serviceRequest.assignedAgentId) {
            return sendErrorResponse(res, new ApiError(403, "Job is not assigned yet. Permission denied."));
        };

        console.log(serviceRequest.assignedAgentId);

        const serviceRequestAssignedAgentId = serviceRequest.assignedAgentId.toString();
        const currentuserId = userId?.toString();

        if (serviceRequestAssignedAgentId !== currentuserId) {
            return sendErrorResponse(res, new ApiError(403, "Permission denied: You are not assigned to this service..."));
        };

        const team = await TeamModel.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return sendErrorResponse(res, new ApiError(404, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }

    const updateData: any = { isReqAcceptedByServiceProvider };

    if (isReqAcceptedByServiceProvider) {
        updateData.serviceProviderId = serviceProviderId;

        switch (serviceRequest.requestProgress) {
            case "Pending":
                if (requestProgress === "Started") {
                    updateData.requestProgress = "Started";
                    updateData.startedAt = new Date();
                }
                break;
            case "Started":
                if (requestProgress === "Completed") {
                    updateData.requestProgress = "Completed";
                    updateData.completedAt = new Date();
                }
                break;
            default:
                updateData.requestProgress = requestProgress;
                if (requestProgress === "Cancelled") {
                    updateData.isReqAcceptedByServiceProvider = false;
                }
                break;
        }
    }

    const updatedService = await ServiceModel.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true });
    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(404, "Service not found for updating."));
    }

    // Calculate total duration if completedAt is available
    let totalExecutionTime: number = 0;
    if (updatedService.completedAt && updatedService.startedAt) {
        totalExecutionTime = (new Date(updatedService.completedAt).getTime() - new Date(updatedService.startedAt).getTime()) / 1000;
    }

    return sendSuccessResponse(res, 200,
        { updatedService, totalExecutionTime },
        isReqAcceptedByServiceProvider ? "Service Request accepted successfully." : "Service Request status updated successfully."
    )
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

// fetch nearby ServiceRequest controller
export const fetchServiceRequest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id as string;
    const userType = req.user?.userType;
    let serviceProviderId, address;

    if (userType === "TeamLead") {
        const permissions = await PermissionModel.findOne({ userId }).select('acceptRequest');

        if (!permissions || !permissions.acceptRequest) {
            return sendErrorResponse(res, new ApiError(403, 'Permission denied: Accept Request not granted.'));
        };

        const team = await TeamModel.aggregate([
            {
                $match: {
                    isDeleted: false,
                    fieldAgentIds: userId
                }
            }
        ]);

        if (team.length > 0) {
            serviceProviderId = team[0].serviceProviderId;
            if (!serviceProviderId) {
                return sendErrorResponse(res, new ApiError(404, 'Service Provider ID not found in team.'));
            };
            address = await AddressModel.findOne({ userId: serviceProviderId });
        } else {
            return sendErrorResponse(res, new ApiError(404, 'Team not found.'));
        };
    } else {
        address = await AddressModel.findOne({ userId });
    };

    if (!address || !address.zipCode || !address.longitude || !address.latitude) {
        return sendErrorResponse(res, new ApiError(400, `User's Location not found`));
    };

    const userZipcode = address.zipCode;
    const userLongitude = address.longitude;
    const userLatitude = address.latitude;

    const radius = 4000 // in meter
    // const minZipcode = userZipcode - 10;
    // const maxZipcode = userZipcode + 10;

    const serviceRequests = await ServiceModel.find({
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [userLongitude, userLatitude] },
                $maxDistance: radius  // Maximum distance in meters
            }
        },
        isReqAcceptedByServiceProvider: false,
        // serviceZipCode: { $gte: minZipcode, $lte: maxZipcode },
        isDeleted: false
    }).populate({
        path: "userId",
        select: "firstName lastName email phone avatar"
    }).populate(
        {
            path: "categoryId",
            select: "name categoryImage"
        }
    );

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
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "serviceProviderId",
                as: "serviceProviderId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId"
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "assignedAgentId",
                as: "assignedAgentId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$assignedAgentId"
            }
        },
        {
            $lookup: {
                from: "shifts",
                foreignField: "_id",
                localField: "serviceShifftId",
                as: "serviceShifftId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceShifftId"
            }
        },      
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                'userId.password': 0,
                'userId.refreshToken': 0,
                'userId.isDeleted': 0,
                'userId.createdAt': 0,
                'userId.updatedAt': 0,
                'userId.userType': 0,
                'userId.isVerified': 0,
                'serviceProviderId.password': 0,
                'serviceProviderId.refreshToken': 0,
                'serviceProviderId.isDeleted': 0,
                'serviceProviderId.createdAt': 0,
                'serviceProviderId.updatedAt': 0,
                'serviceProviderId.userType': 0,
                'serviceProviderId.isVerified': 0,
                'serviceProviderId.__v': 0,
                'serviceProviderId.signupType': 0,
                'assignedAgentId.password': 0,
                'assignedAgentId.refreshToken': 0,
                'assignedAgentId.isDeleted': 0,
                'assignedAgentId.createdAt': 0,
                'assignedAgentId.updatedAt': 0,
                'assignedAgentId.userType': 0,
                'assignedAgentId.isVerified': 0,
                'assignedAgentId.__v': 0,
                'assignedAgentId.signupType': 0,
                'categoryId.isDeleted': 0,
                'categoryId.__v': 0,
                'categoryId.owner': 0,
                'categoryId.createdAt': 0,
                'categoryId.updatedAt': 0,
                // 'serviceShifftId.shiftTimes': 0,
                'serviceShifftId.updatedAt': 0,
                'serviceShifftId.createdBy': 0,
                'serviceShifftId.__v': 0,
                'serviceShifftId.isDeleted': 0,
                'serviceShifftId.createdAt': 0,
            }
        },
    ]);

    return sendSuccessResponse(res, 200, serviceRequestToFetch, "Service request retrieved successfully.");

});


// Function to fetch associated customer with the service request
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


export const getServiceRequestByStatus = asyncHandler(async (req: Request, res: Response) => {
    const { requestProgress } = req.body;
    const results = await ServiceModel.aggregate([
        {
            $match: {
                requestProgress: requestProgress,
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
        // {
        //     $unwind: {
        //         // preserveNullAndEmptyArrays: true,
        //         path: "$categoryId"
        //     }
        // },
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

    const totalRequest = results.length;

    return sendSuccessResponse(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
});


export const assignJob = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userType = req.user?.userType;
    let serviceProviderId = req.user?._id;
    const { assignedAgentId, serviceId } = req.body;

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    let isAssignable = true;

    if (userType === "TeamLead") {
        const teamInfo = await TeamModel.findOne({ fieldAgentIds: req.user?._id });
        if (teamInfo) {
            serviceProviderId = teamInfo?.serviceProviderId;
        }

        const agentUser = await UserModel.findById(assignedAgentId).select('userType');
        isAssignable = agentUser?.userType === "FieldAgent" || agentUser?.userType === "TeamLead";
    };

    if (!isAssignable) {
        return sendErrorResponse(res, new ApiError(403, "Assigned agent must be a FieldAgent."));
    };

    const updatedService = await ServiceModel.findByIdAndUpdate(
        serviceId,
        {
            $set: {
                assignedAgentId: new mongoose.Types.ObjectId(assignedAgentId),
                serviceProviderId: serviceProviderId
            }
        },
        { new: true }
    );

    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(404, "Service not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedService, "Job assigned to the agent successfully.");
});

export const totalJobCount = asyncHandler(async (req: CustomRequest, res: Response) => {
    const serviceProviderId = req.user?._id;

    if (!serviceProviderId) {
        return sendErrorResponse(res, new ApiError(400, "Service provider ID is required."));
    };

    const jobData = await ServiceModel.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: serviceProviderId
            }
        },
        {
            $group: {
                _id: "$requestProgress",
                count: { $sum: 1 },
                jobDetails: { $push: "$$ROOT" }
            }
        }
    ]);
    return sendSuccessResponse(res, 200, jobData, "Job counts retrieved successfully.");
});
