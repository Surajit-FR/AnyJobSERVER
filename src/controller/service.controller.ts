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
import { PipelineStage } from 'mongoose';
import axios from "axios";
import { date } from "joi";



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
        serviceProductImage,
        answerArray // Expecting answerArray instead of answers
    }: IAddServicePayloadReq = req.body;

    // Validate required fields
    if (!categoryId) return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    if (!serviceStartDate) return sendErrorResponse(res, new ApiError(400, "Service start date is required."));
    if (!serviceShifftId) return sendErrorResponse(res, new ApiError(400, "Service shift ID is required."));
    if (!SelectedShiftTime) return sendErrorResponse(res, new ApiError(400, "Selected shift time is required."));
    if (!serviceZipCode) return sendErrorResponse(res, new ApiError(400, "Service ZIP code is required."));
    // if (!serviceLatitude || !serviceLongitude) return sendErrorResponse(res, new ApiError(400, "Service location is required."));
    if (!answerArray || !Array.isArray(answerArray)) return sendErrorResponse(res, new ApiError(400, "Answer array is required and must be an array."));

    // Conditional checks for incentive and tip amounts
    if (isIncentiveGiven && (incentiveAmount === undefined || incentiveAmount <= 0)) {
        return sendErrorResponse(res, new ApiError(400, "Incentive amount must be provided and more than zero if incentive is given."));
    }
    if (isTipGiven && (tipAmount === undefined || tipAmount <= 0)) {
        return sendErrorResponse(res, new ApiError(400, "Tip amount must be provided and more than zero if tip is given."));
    }
    const apiKey = process.env.GOOGLE_API_KEY;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${serviceZipCode}&key=${apiKey}`;

    const geocodeResponse = await axios.get(geocodeUrl);

    const locationDetails = geocodeResponse?.data?.results[0]

    if (!locationDetails) return sendErrorResponse(res, new ApiError(400, "Service ZIP code is invalid."));
    const fetchedCoordinates = {
        longitude: locationDetails?.geometry?.location?.lng,
        latitude: locationDetails?.geometry?.location?.lat,
    };

    const formattedAddress = locationDetails?.formatted_address

    //strcture location object for geospatial query
    const location = {
        type: "Point",
        coordinates: [fetchedCoordinates.longitude, fetchedCoordinates.latitude] // [longitude, latitude]
    };

    console.log("api runs");

    // Prepare the new service object
    const newService = await ServiceModel.create({
        categoryId,
        serviceShifftId,
        SelectedShiftTime,
        serviceStartDate,
        serviceZipCode,
        serviceLatitude: fetchedCoordinates.latitude,
        serviceLongitude: fetchedCoordinates.longitude,
        serviceAddress: formattedAddress,
        location: location,
        isIncentiveGiven,
        incentiveAmount,
        isTipGiven,
        tipAmount,
        otherInfo,
        answerArray,
        serviceProductImage,
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
    console.log(req.query);


    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const searchQuery = {
        isDeleted: false,
        ...(query && {
            $or: [
                { 'userId.firstName': { $regex: query, $options: "i" } },
                { 'userId.lastName': { $regex: query, $options: "i" } },
                { requestProgress: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ]
        })
    };

    const validSortBy = (sortBy as string) || 'createdAt';
    const validSortType = (sortType as string).toLowerCase() === 'desc' ? -1 : 1;

    const sortCriteria: any = {};
    sortCriteria[validSortBy] = validSortType;

    const results = await ServiceModel.aggregate([
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId'
            }
        },
        { $unwind: '$userId' },
        { $match: searchQuery },
        { $sort: { createdAt: validSortType } },
        { $skip: skip },
        { $limit: limitNumber },
        {
            $project: {
                "_id": 1,
                "serviceStartDate": 1,
                "requestProgress": 1,
                "tipAmount": 1,
                "userId.firstName": 1,
                "userId.lastName": 1,
                // userName: { $concat: ["$userId.firstName", " ", "$userId.lastName"] },
                createdAt: 1
            }
        }
    ]);
    // console.log({ results });
    const totalRecords = await ServiceModel.aggregate([
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId'
            }
        },
        { $unwind: '$userId' },
        { $match: searchQuery },
        { $count: 'total' },
        { $sort: { createdAt: -1 } }
    ]);


    const total = totalRecords[0]?.total || 0;
    // console.log(total);


    return sendSuccessResponse(res, 200, {
        serviceRequests: results,
        pagination: {
            totalRecords: total,
            page: pageNumber,
            limit: limitNumber
        }
    }, "All Service requests retrieved successfully.");
});

// get accepted ServiceRequest controller
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
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [
                    {
                        $lookup: {
                            from: 'ratings',
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings"
                        }
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: { $ifNull: [{ $avg: "$userRatings.rating" }, 0] }
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryDetails",
            }
        },

        {
            $project: {
                categoryName: "$categoryDetails.name",
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"]
                },
                distance: 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                requestProgress: 1,
                totalRatings: '$userId.totalRatings',
                userAvgRating: '$userId.userAvgRating',
                userAvtar: '$userId.avatar',
                serviceProviderId: 1,
                updatedAt: 1

            }
        },
        { $sort: { updatedAt: 1 } }
    ]);

    return sendSuccessResponse(res, 200, results, "Job queue retrieved successfully.");
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
        return sendErrorResponse(res, new ApiError(400, "Service not found for updating."));
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
        return sendErrorResponse(res, new ApiError(400, "Service not found."));
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
            return sendErrorResponse(res, new ApiError(400, 'Service Provider ID not found for team.'));
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
            return sendErrorResponse(res, new ApiError(400, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }

    const updateData: any = { isReqAcceptedByServiceProvider, updatedAt: Date.now() };

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
        return sendErrorResponse(res, new ApiError(400, "Service not found for updating."));
    }

    // Calculate total duration if completedAt is available
    let totalExecutionTimeInMinutes: number = 0;
    if (updatedService.completedAt && updatedService.startedAt) {
        totalExecutionTimeInMinutes = (new Date(updatedService.completedAt).getTime() - new Date(updatedService.startedAt).getTime()) / (1000 * 60);
    }


    return sendSuccessResponse(res, 200,
        { updatedService, totalExecutionTimeInMinutes },
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
        return sendErrorResponse(res, new ApiError(400, "Service  not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Service deleted successfully");
});

// fetch nearby ServiceRequest controller
export const fetchServiceRequest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { page = "1", limit = "10", query = '', sortBy = 'createdAt', sortType = 'desc', categoryName = '' } = req.query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    console.log(categoryName);

    const searchQuery = {
        isDeleted: false,
        ...(query && {
            $or: [
                { serviceAddress: { $regex: query, $options: "i" } },
                { categoryName: { $regex: query, $options: "i" } },
                { requestProgress: { $regex: query, $options: "i" } },
                { customerName: { $regex: query, $options: "i" } },
            ]
        })
    };

    const validSortBy = (sortBy as string) || 'isIncentiveGiven' || 'incentiveAmount';
    const validSortType = (sortType as string).toLowerCase() === 'desc' ? -1 : 1;

    const sortCriteria: any = {};
    sortCriteria[validSortBy] = validSortType;


    const userId = req.user?._id as string;
    const userType = req.user?.userType;

    let serviceProviderId: string | undefined;
    let address: any;

    if (userType === 'TeamLead') {
        const team = await TeamModel.aggregate([
            {
                $match: {
                    isDeleted: false,
                    fieldAgentIds: userId
                }
            }
        ]);

        if (team.length === 0) {
            return sendErrorResponse(res, new ApiError(400, 'Team not found.'));
        }

        serviceProviderId = team[0].serviceProviderId;
        if (!serviceProviderId) {
            return sendErrorResponse(res, new ApiError(400, 'Service Provider ID not found in team.'));
        }

        address = await AddressModel.findOne({ userId: serviceProviderId });
    } else {
        address = await AddressModel.findOne({ userId });
    }

    if (!address || !address.zipCode || !address.longitude || !address.latitude) {
        return sendErrorResponse(res, new ApiError(400, 'User\'s location not found.'));
    }

    const longitude = address.longitude;
    const latitude = address.latitude;
    // Extract coordinates and validate
    const serviceRequestLongitude: number = parseFloat(longitude);
    const serviceRequestLatitude: number = parseFloat(latitude);

    if (isNaN(serviceRequestLongitude) || isNaN(serviceRequestLatitude)) {
        return sendErrorResponse(res, new ApiError(400, `Invalid longitude or latitude`));
    }
    const radius = 400000000; // in meters

    const serviceRequests = await ServiceModel.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [serviceRequestLongitude, serviceRequestLatitude] },
                distanceField: 'distance',
                spherical: true,
                maxDistance: radius,

            }
        },
        { $match: { isDeleted: false, isReqAcceptedByServiceProvider: false, requestProgress: "NotStarted" } },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [
                    {
                        $lookup: {
                            from: 'ratings',
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings"
                        }
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: { $ifNull: [{ $avg: "$userRatings.rating" }, 0] }
                        }
                    },
                ]
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryDetails",
            }
        },
        { $match: searchQuery },
        { $sort: { isIncentiveGiven: validSortType } },
        { $skip: skip },
        { $limit: limitNumber },
        {
            $project: {
                categoryName: "$categoryDetails.name",
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"]
                },
                distance: 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                requestProgress: 1,
                totalRatings: '$userId.totalRatings',
                userAvgRating: '$userId.userAvgRating',
                userAvtar: '$userId.avatar',

            }
        },
        { $sort: { isIncentiveGiven: -1, incentiveAmount: -1 } }
    ]);
    if (!serviceRequests.length) {
        return sendSuccessResponse(res, 200, serviceRequests, 'No nearby service request found');
    }

    const total = serviceRequests[0] ? serviceRequests.length : 0
    return sendSuccessResponse(res, 200, {
        serviceRequests, pagination: {
            totalRecords: total,
            page: pageNumber,
            limit: limitNumber
        }
    }, 'Service requests fetched successfully');

});


//fetch nearby service provider 
export const fetchNearByServiceProvider = asyncHandler(async (req: Request, res: Response) => {
    const { serviceRequestId } = req.params;

    if (!serviceRequestId) {
        return sendErrorResponse(res, new ApiError(400, `Invalid ServiceRequest ID`));
    }

    const serviceRequest = await ServiceModel.findById(serviceRequestId);
    if (!serviceRequest) {
        return sendErrorResponse(res, new ApiError(400, `Service request not found`));
    }

    // Extract coordinates and validate
    const serviceRequestLongitude: number = parseFloat(serviceRequest.serviceLongitude);
    const serviceRequestLatitude: number = parseFloat(serviceRequest.serviceLatitude);

    if (isNaN(serviceRequestLongitude) || isNaN(serviceRequestLatitude)) {
        return sendErrorResponse(res, new ApiError(400, `Invalid longitude or latitude`));
    }

    const radius = 40000; // Radius in meters

    const pipeline: PipelineStage[] = [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [serviceRequestLongitude, serviceRequestLatitude] },
                distanceField: 'distance',
                spherical: true,
                maxDistance: radius,
                query: {
                    userType: 'ServiceProvider',
                    isDeleted: false
                }

            }
        },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "_id",
                as: "additionalInfo"
            }
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                'additionalInfo.__v': 0,
                'additionalInfo.isDeleted': 0,
            }
        },
        // {
        //     $sort: { distance: -1 }
        // }
    ];

    const serviceProviders = await UserModel.aggregate(pipeline) as Array<any>;
    if (!serviceProviders.length) {
        return sendErrorResponse(res, new ApiError(400, 'No nearby service providers found.'));
    }

    const updatePayload = {
        isReqAcceptedByServiceProvider: true,
        requestProgress: 'Pending',
        serviceProviderId: serviceProviders[0]._id
    };

    const acceptRequest = await ServiceModel.findByIdAndUpdate({ _id: serviceRequestId }, updatePayload, { new: true })

    return sendSuccessResponse(res, 200, serviceProviders[0], 'Nearby Service Providers assigned successfully');
});

// fetchSingleServiceRequest controller
export const fetchSingleServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const { serviceId } = req.params;

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
                as: "userId",
                pipeline: [
                    {
                        $lookup: {
                            from: 'ratings',
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings"
                        }
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: { $ifNull: [{ $avg: "$userRatings.rating" }, 0] }
                        }
                    }
                ]
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
            $addFields: {
                bookedTimeSlot: {
                    $filter: {
                        input: "$serviceShifftId.shiftTimes",
                        as: "shiftTime",
                        cond: { $eq: ["$$shiftTime._id", "$SelectedShiftTime.shiftTimeId"] }
                    }
                }
            }
        },
        {
            $project: {
                categoryName: "$categoryId.name",
                bookedServiceShift: "$serviceShifftId.shiftName",
                bookedTimeSlot: 1,
                serviceStartDate: 1,
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"]
                },
                'customerEmail': "$userId.email",
                'customerAvatar': "$userId.avatar",
                'customerPhone': "$userId.phone",
                totalCustomerRatings: '$userId.totalRatings',
                customerAvgRating: '$userId.userAvgRating',
                serviceProviderName: {
                    $concat: ["$serviceProviderId.firstName", " ", "$serviceProviderId.lastName"]
                },
                'serviceProviderEmail': "$serviceProviderId.email",
                'serviceProviderAvatar': "$serviceProviderId.avatar ",
                'serviceProviderPhone': "$serviceProviderId.phone",
                assignedAgentName: {
                    $concat: ["$assignedAgentId.firstName", " ", "$assignedAgentId.lastName"]
                },
                'assignedAgentEmail': "$assignedAgentId.email",
                'assignedAgentAvatar': "$assignedAgentId.avatar",
                'assignedAgentPhone': "$assignedAgentId.phone",
                serviceAddress: 1,
                answerArray: 1,
                serviceProductImage: 1,
                serviceDescription: "$otherInfo.serviceDescription",
                serviceProductSerialNumber: "$otherInfo.productSerialNumber",
                requestProgress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                createdAt: 1,
                updatedAt: 1,
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

//get service request for customer
export const getServiceRequestByStatus = asyncHandler(async (req: CustomRequest, res: Response) => {

    const userId = req.user?._id
    const { requestProgress } = req.body;
    const progressFilter =
        requestProgress === "InProgress"
            ? { requestProgress: { $in: ["Pending", "Started"] } }
            : requestProgress === "jobQueue"
                ? { requestProgress: "NotStarted" }
                : { requestProgress };

    const results = await ServiceModel.aggregate([
        {
            $match: {
                ...progressFilter,
                userId: userId
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
                as: "userId",
                pipeline: [
                    {
                        $lookup: {
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "customerRatings",
                        }
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$customerRatings" },
                            customerAvgRating: {
                                $cond: {
                                    if: { $gt: [{ $size: "$customerRatings" }, 0] },
                                    then: { $avg: "$customerRatings.rating" },
                                    else: 0
                                }
                            }
                        }
                    }
                ]
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
                as: "serviceProviderId",
                pipeline: [
                    {
                        $lookup: {
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "serviceProviderIdRatings",
                        }
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$serviceProviderIdRatings" },
                            serviceProviderRatings: {
                                $cond: {
                                    if: { $gt: [{ $size: "$serviceProviderIdRatings" }, 0] },
                                    then: { $avg: "$serviceProviderIdRatings.rating" },
                                    else: 0
                                }
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId"
            }
        },
        {
            $project: {
                _id: 1,
                'categoryId.name': 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                startedAt: 1,
                completedAt: 1,

                requestProgress: 1,
                'serviceProviderId.firstName': 1,
                'serviceProviderId.lastName': 1,
                'serviceProviderId.avatar': 1,
                'serviceProviderId.numberOfRatings': 1,
                'serviceProviderId.serviceProviderRatings': 1,
                createdAt: 1

            }
        },
        { $sort: { createdAt: -1 } },
    ]);

    const totalRequest = results.length;

    return sendSuccessResponse(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
});

//get service request for service provider
export const getJobByStatus = asyncHandler(async (req: CustomRequest, res: Response) => {

    const serviceProviderId = req.user?._id
    const { requestProgress } = req.body;
    const progressFilter =
        requestProgress === "Accepted"
            ? { requestProgress: { $in: ["Pending",] } }
            : requestProgress === "Started"
                ? { requestProgress: "Started" }
                : { requestProgress };

    const results = await ServiceModel.aggregate([
        {
            $match: {
                ...progressFilter,
                serviceProviderId: serviceProviderId
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
                preserveNullAndEmptyArrays: true,
                path: "$categoryId"
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "userId",
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
                localField: "assignedAgentId",
                as: "assignedAgentId",
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
                _id: 1,
                categoryName: '$categoryId.name',
                requestProgress: 1,
                customerFirstName: '$userId.firstName',
                customerLastName: '$userId.lastName',
                'assignedAgentId.firstName': 1,
                'assignedAgentId.lastName': 1,
                customerAvatar: '$userId.avatar',
                createdAt: 1

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

        const permissions = await PermissionModel.findOne({ userId: req.user?._id }).select('assignJob');
        if (!permissions?.fieldAgentManagement) {
            return sendErrorResponse(res, new ApiError(403, 'Permission denied: Assign Job not granted.'));
        }       

        // const teamInfo = await TeamModel.findOne({ fieldAgentIds: req.user?._id });
        // if (teamInfo) {
        //     serviceProviderId = teamInfo?.serviceProviderId;
        // }

        // const agentUser = await UserModel.findById(assignedAgentId).select('userType');
        // isAssignable = agentUser?.userType === "FieldAgent" || agentUser?.userType === "TeamLead";
    };

    // if (!isAssignable) {
    //     return sendErrorResponse(res, new ApiError(403, "Assigned agent must be a FieldAgent."));
    // };

    const updatedService = await ServiceModel.findByIdAndUpdate(
        serviceId,
        {
            $set: {
                assignedAgentId: new mongoose.Types.ObjectId(assignedAgentId),
                // serviceProviderId: serviceProviderId
            }
        },
        { new: true }
    );

    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(400, "Service not found for assigning."));
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

export const fetchAssignedserviceProvider = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { serviceId } = req.params

    if (!serviceId) {
        return sendErrorResponse(res, new ApiError(400, "Service ID is required."));
    };

    const assignedSPDetails = await ServiceModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(serviceId)
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "serviceProviderId",
                as: "SP_Details"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$SP_Details"
            }
        },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "serviceProviderId",
                as: "SP_Additional_Details"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$SP_Additional_Details"
            }
        },
        {
            $addFields: {
                spFullName: { $concat: ["$SP_Details.firstName", " ", "$SP_Details.lastName"] },
                companyDesc: "$SP_Additional_Details.companyIntroduction",
                backgroundCheck: {
                    $cond: ["$SP_Details.isVerified", true, false]
                },
                licenseVerified: {
                    $cond: ["$SP_Details.isVerified", true, false]
                },
                insuranceVerified: {
                    $cond: ["$SP_Details.isVerified", true, false]
                },
                arrivalFee: {
                    $cond: ["$SP_Additional_Details.isAnyArrivalFee", "$SP_Additional_Details.arrivalFee", 0]
                },
            }
        },
        {
            $project: {
                spFullName: 1,
                companyDesc: 1,
                backgroundCheck: 1,
                licenseVerified: 1,
                insuranceVerified: 1,
                arrivalFee: 1
            }
        }
    ]);

    return sendSuccessResponse(res, 200, assignedSPDetails[0], "Assigned service provider retrieved successfully.");

});
