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
import sendNotification from "../utils/sendPushNotification";
import { isNotificationPreferenceOn } from "../utils/auth";
import { NotificationModel } from "../models/notification.model";
import { log } from "console";



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
export const cancelServiceRequest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { requestProgress, serviceId }: { requestProgress: string, serviceId: string } = req.body;

    if (!serviceId || !requestProgress) {
        return sendErrorResponse(res, new ApiError(400, "Service ID and request progress is required."));
    };

    const updatedService = await ServiceModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(serviceId), userId: req.user?._id },
        {
            $set: {
                requestProgress: "Cancelled",
            }
        }, { new: true }
    );

    if (!updatedService) {
        return sendSuccessResponse(res, 200, "Service not found for updating.");
    };
    if (updatedService.serviceProviderId) {
        const userFcm = req.user?.fcmToken || ""
        const notiTitle = "Service Requested Cancelled by Customer "
        const notiBody = ` ${req.user?.firstName ?? "User"} ${req.user?.lastName ?? ""} has cancelled the service request`
        const notiData1 = {
            senderId: req.user?._id,
            receiverId: updatedService.serviceProviderId,
            title: notiTitle,
            notificationType: "Customer Cancelled Service",
        }
        // const notifyUser1 = await sendNotification(userFcm, notiTitle, notiBody, notiData1)

    }

    return sendSuccessResponse(res, 200, "Service Request cancelled Successfully");
});

// updateService controller
export const addorUpdateIncentive = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { incentiveAmount, serviceId }: { isIncentiveGiven: boolean, incentiveAmount: number, serviceId: string } = req.body;

    if (!serviceId || !incentiveAmount) {
        return sendErrorResponse(res, new ApiError(400, "Service ID, incentive check and incentive amount is required."));
    };

    const updatedService = await ServiceModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(serviceId), userId: req.user?._id },
        {
            $set: {
                isIncentiveGiven: true,
                incentiveAmount
            }
        }, { new: true }
    );

    if (!updatedService) {
        return sendSuccessResponse(res, 200, "Service request not found for updating.");
    };

    return sendSuccessResponse(res, 200, "Incentive added for the service request.");
});

// handleServiceRequestState controller
export const handleServiceRequestState = asyncHandler(async (req: CustomRequest, res: Response) => {
    const registrationToken = "dXt8fLvzy9s:APA91bEYQH12Iu6jfsFv2I6yDd6bLfTRN6AqY6fjEDpD7YDeDRH5I7XXjWxcbPxyErmc7KjUjHiEnJ0K7yOHgdP_xUq8c9zcp6F5Bcwb0s_fi_NDszErlr3sB5P5Wf8ItvPH4ch5vwbb";
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
    const customerDetails = await UserModel.findById(serviceRequest?.userId)
    const serviceProviderDetails = await UserModel.findById(serviceRequest?.serviceProviderId).select('serviceProviderId')
    let userFcm, notiTitle, notiBody;

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

            case "NotStarted":

            case "Cancelled":

                if (requestProgress === "Pending") {
                    updateData.requestProgress = "Pending";
                }
                userFcm = customerDetails?.fcmToken || ""
                notiTitle = "Service Requested Accepted "
                notiBody = `Your Service Request is accepted by ${req.user?.firstName ?? "User"} ${req.user?.lastName ?? ""}`
                const notiData4 = {
                    senderId: req.user?._id,
                    receiverId: serviceRequest.userId,
                    title: notiTitle,
                    notificationType: "Service Accepeted",
                }
                // const notifyUser1 = await sendNotification(userFcm, notiTitle, notiBody, notiData1)
                break;


            case "Pending":
                // console.log("case2:Pending");

                if (requestProgress === "Started") {
                    updateData.requestProgress = "Started";
                    updateData.startedAt = new Date();
                }
                userFcm = serviceProviderDetails?.fcmToken || ""
                notiTitle = "Mark job as completed"
                notiBody = `${req.user?.firstName ?? "User"} ${req.user?.lastName ?? ""} has marked the job as started`
                const notiData2 = {
                    senderId: req.user?._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notiTitle,
                    notificationType: "Service Started",
                }
                // const notifyUser2 = await sendNotification(userFcm, notiTitle, notiBody, notiData2)                


                break;

            case "Started":
                if (requestProgress === "Completed") {
                    console.log("ss runs")

                    updateData.requestProgress = "Completed";
                    updateData.completedAt = new Date();

                    userFcm = serviceProviderDetails?.fcmToken || ""
                    notiTitle = "Mark job as completed"
                    notiBody = `${req.user?.firstName ?? "User"} ${req.user?.lastName ?? ""} has marked the job as completed`
                    const notiData3 = {
                        senderId: req.user?._id,
                        receiverId: serviceRequest.serviceProviderId,
                        title: notiTitle,
                        notificationType: "Service Completed",
                    }
                    // const notifyUser3 = await sendNotification(userFcm, notiTitle, notiBody, notiData3)


                }

                break;



        }
    }

    // Allow service provider to cancel at any time except when NotStarted
    if (serviceRequest.requestProgress !== "NotStarted" && requestProgress === "Cancelled") {
        updateData.isReqAcceptedByServiceProvider = false;
        updateData.requestProgress = "Cancelled";


        userFcm = serviceProviderDetails?.fcmToken || ""
        notiTitle = "Mark job as cancelled"
        notiBody = `${req.user?.firstName ?? "User"} ${req.user?.lastName ?? ""} has marked the job as cancelled`
        const notiData4 = {
            senderId: req.user?._id,
            receiverId: serviceRequest.serviceProviderId,
            title: notiTitle,
            notificationType: "Agent Cancelled Service",
        }
        // const notifyUser4 = await sendNotification(userFcm, notiTitle, notiBody, notiData4)

    }

    const updatedService = await ServiceModel.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true });
    if (!updatedService) {
        return sendErrorResponse(res, new ApiError(400, "Service not found for updating."));
    }



    if (requestProgress == "Pending") {
        return sendSuccessResponse(res, 200, { updatedService }, "Service request accepted successfully.")
    } else if (requestProgress == "Started") {
        return sendSuccessResponse(res, 200, { updatedService }, "Service request started successfully.")
    } else if (requestProgress == "Completed") {
        // Calculate total duration if completedAt is availabler    
        let totalExecutionTimeInMinutes: number = 0;
        if (updatedService.completedAt && updatedService.startedAt) {
            totalExecutionTimeInMinutes = (new Date(updatedService.completedAt).getTime() - new Date(updatedService.startedAt).getTime()) / (1000 * 60);
        }

        return sendSuccessResponse(res, 200, { updatedService, totalExecutionTimeInMinutes }, "Service request completed successfully.")
    } else {
        return sendSuccessResponse(res, 200, { updatedService }, "Service request cancelled successfully.")
    }

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

    // const isNotificationOn = await isNotificationPreferenceOn(req.user?._id as string)

    // if (!isNotificationOn) {
    //     return sendSuccessResponse(res, 200, "Notification permission is off.")
    // }

    const { page = "1", limit = "10", query = '', sortBy = 'isIncentiveGiven', sortType = 'desc', categoryName = '' } = req.query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const searchQuery = {
        isDeleted: false,
        ...(query && {
            $or: [
                { serviceAddress: { $regex: query, $options: "i" } },
                { 'userId.firstName': { $regex: query, $options: "i" } },
                { 'userId.lastName': { $regex: query, $options: "i" } },
                { 'categoryDetails.name': { $regex: query, $options: "i" } },
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
        { $match: { isDeleted: false, isReqAcceptedByServiceProvider: false, } },
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
        // { $sort: { isIncentiveGiven: validSortType } },
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
    const totalRecords = await ServiceModel.countDocuments({ isDeleted: false, isReqAcceptedByServiceProvider: false, requestProgress: "NotStarted" });
    // const total = serviceRequests[0] ? serviceRequests.length : 0
    return sendSuccessResponse(res, 200, {
        serviceRequests, pagination: {
            totalRecords: totalRecords,
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
                as: "serviceProviderId",
                pipeline: [
                    {
                        $lookup: {
                            from: "additionalinfos",
                            foreignField: "userId",
                            localField: "_id",
                            as: "providerAdditionalInfo",

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
                'serviceProviderAvatar': "$serviceProviderId.avatar",
                'serviceProviderPhone': "$serviceProviderId.phone",
                'serviceProviderCompanyName': "$serviceProviderId.providerAdditionalInfo.companyName",
                'serviceProviderCompanyDesc': "$serviceProviderId.providerAdditionalInfo.companyIntroduction",
                'serviceProviderBusinessImage': "$serviceProviderId.providerAdditionalInfo.businessImage",
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
                isReqAcceptedByServiceProvider: 1,
                requestProgress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                createdAt: 1,
                updatedAt: 1,
                serviceLatitude: 1,
                serviceLongitude: 1
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
                ? { requestProgress: { $in: ["NotStarted", "Cancelled"] } }
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
                'categoryId.categoryImage': 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                startedAt: 1,
                completedAt: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
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
                ? { requestProgress: "Started" } : requestProgress === "All" ? {}
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
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                customerFirstName: '$userId.firstName',
                customerLastName: '$userId.lastName',
                'assignedAgentId.firstName': 1,
                'assignedAgentId.lastName': 1,
                'assignedAgentId._id': 1,
                'assignedAgentId.avatar': 1,
                'assignedAgentId.phone': 1,
                customerAvatar: '$userId.avatar',
                totalCustomerRatings: '$userId.totalRatings',
                customerAvgRating: '$userId.userAvgRating',

                createdAt: 1

            }
        },
        { $sort: { createdAt: -1 } },

    ]);

    const totalRequest = results.length;

    return sendSuccessResponse(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
});

//get service request for field agent
export const getJobByStatusByAgent = asyncHandler(async (req: CustomRequest, res: Response) => {
    // console.log(req.user?._id);
    const assignedAgentId = req.user?._id
    const { requestProgress } = req.body;
    const progressFilter =
        requestProgress === "Assigned" ? { requestProgress: "Pending", assignedAgentId: req.user?._id }

            : { requestProgress };

    const results = await ServiceModel.aggregate([
        {
            $match: {
                ...progressFilter,
                assignedAgentId: assignedAgentId
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
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                customerFirstName: '$userId.firstName',
                customerLastName: '$userId.lastName',
                'assignedAgentId.firstName': 1,
                'assignedAgentId.lastName': 1,
                'assignedAgentId._id': 1,
                'assignedAgentId.avatar': 1,
                'assignedAgentId.phone': 1,
                customerAvatar: '$userId.avatar',
                totalCustomerRatings: '$userId.totalRatings',
                customerAvgRating: '$userId.userAvgRating',
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


//get service request for customer
export const getCompletedService = asyncHandler(async (req: CustomRequest, res: Response) => {

    const userId = req.user?._id

    const results = await ServiceModel.aggregate([
        {
            $match: {
                requestProgress: "Completed",
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
        // {
        //     $lookup: {
        //         from: "users",
        //         foreignField: "_id",
        //         localField: "userId",
        //         as: "userId",
        //         pipeline: [
        //             {
        //                 $lookup: {
        //                     from: "ratings",
        //                     foreignField: "ratedTo",
        //                     localField: "_id",
        //                     as: "customerRatings",
        //                 }
        //             },
        //             {
        //                 $addFields: {
        //                     numberOfRatings: { $size: "$customerRatings" },
        //                     customerAvgRating: {
        //                         $cond: {
        //                             if: { $gt: [{ $size: "$customerRatings" }, 0] },
        //                             then: { $avg: "$customerRatings.rating" },
        //                             else: 0
        //                         }
        //                     }
        //                 }
        //             }
        //         ]
        //     }
        // },
        // {
        //     $unwind: {
        //         preserveNullAndEmptyArrays: true,
        //         path: "$userId"
        //     }
        // },
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
                'categoryId.categoryImage': 1,
                requestProgress: 1,
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


//get customer's address history
export const fetchServiceAddressHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;

    const results = await ServiceModel.aggregate([
        {
            $match: {
                userId: userId,
                isDeleted: false
            }
        },
        {
            $group: {
                _id: "$serviceAddress",
                createdAt: { $max: "$createdAt" },
                serviceId: { $first: "$_id" },
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $project: {
                _id: 0,
                serviceAddress: "$_id",
                createdAt: 1,
                serviceId: 1,
            }
        }
    ]);

    return sendSuccessResponse(res, 200, { results, totalRequest: results.length }, "Unique service address history retrieved successfully.");
});
