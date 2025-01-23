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
exports.fetchAssignedserviceProvider = exports.totalJobCount = exports.assignJob = exports.getJobByStatusByAgent = exports.getJobByStatus = exports.getServiceRequestByStatus = exports.fetchAssociatedCustomer = exports.fetchSingleServiceRequest = exports.fetchNearByServiceProvider = exports.fetchServiceRequest = exports.deleteService = exports.handleServiceRequestState = exports.addorUpdateIncentive = exports.cancelServiceRequest = exports.getAcceptedServiceRequestInJobQueue = exports.getServiceRequestList = exports.addService = void 0;
const service_model_1 = __importDefault(require("../models/service.model"));
const address_model_1 = __importDefault(require("../models/address.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const permission_model_1 = __importDefault(require("../models/permission.model"));
const teams_model_1 = __importDefault(require("../models/teams.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const axios_1 = __importDefault(require("axios"));
const sendPushNotification_1 = __importDefault(require("../utils/sendPushNotification"));
const auth_1 = require("../utils/auth");
// addService controller
exports.addService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const { categoryId, serviceStartDate, serviceShifftId, SelectedShiftTime, serviceZipCode, serviceLatitude, serviceLongitude, isIncentiveGiven, incentiveAmount, isTipGiven, tipAmount, otherInfo, serviceProductImage, answerArray // Expecting answerArray instead of answers
     } = req.body;
    // Validate required fields
    if (!categoryId)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category ID is required."));
    if (!serviceStartDate)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service start date is required."));
    if (!serviceShifftId)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service shift ID is required."));
    if (!SelectedShiftTime)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Selected shift time is required."));
    if (!serviceZipCode)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ZIP code is required."));
    // if (!serviceLatitude || !serviceLongitude) return sendErrorResponse(res, new ApiError(400, "Service location is required."));
    if (!answerArray || !Array.isArray(answerArray))
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Answer array is required and must be an array."));
    // Conditional checks for incentive and tip amounts
    if (isIncentiveGiven && (incentiveAmount === undefined || incentiveAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Incentive amount must be provided and more than zero if incentive is given."));
    }
    if (isTipGiven && (tipAmount === undefined || tipAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Tip amount must be provided and more than zero if tip is given."));
    }
    const apiKey = process.env.GOOGLE_API_KEY;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${serviceZipCode}&key=${apiKey}`;
    const geocodeResponse = yield axios_1.default.get(geocodeUrl);
    const locationDetails = (_a = geocodeResponse === null || geocodeResponse === void 0 ? void 0 : geocodeResponse.data) === null || _a === void 0 ? void 0 : _a.results[0];
    if (!locationDetails)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ZIP code is invalid."));
    const fetchedCoordinates = {
        longitude: (_c = (_b = locationDetails === null || locationDetails === void 0 ? void 0 : locationDetails.geometry) === null || _b === void 0 ? void 0 : _b.location) === null || _c === void 0 ? void 0 : _c.lng,
        latitude: (_e = (_d = locationDetails === null || locationDetails === void 0 ? void 0 : locationDetails.geometry) === null || _d === void 0 ? void 0 : _d.location) === null || _e === void 0 ? void 0 : _e.lat,
    };
    const formattedAddress = locationDetails === null || locationDetails === void 0 ? void 0 : locationDetails.formatted_address;
    //strcture location object for geospatial query
    const location = {
        type: "Point",
        coordinates: [fetchedCoordinates.longitude, fetchedCoordinates.latitude] // [longitude, latitude]
    };
    console.log("api runs");
    // Prepare the new service object
    const newService = yield service_model_1.default.create({
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
        userId: (_f = req.user) === null || _f === void 0 ? void 0 : _f._id
    });
    if (!newService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while creating the Service Request."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, newService, "Service Request added Successfully");
}));
// getServiceRequestList controller
exports.getServiceRequestList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { page = "1", limit = "10", query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;
    console.log(req.query);
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isDeleted: false }, (query && {
        $or: [
            { 'userId.firstName': { $regex: query, $options: "i" } },
            { 'userId.lastName': { $regex: query, $options: "i" } },
            { requestProgress: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
    }));
    const validSortBy = sortBy || 'createdAt';
    const validSortType = sortType.toLowerCase() === 'desc' ? -1 : 1;
    const sortCriteria = {};
    sortCriteria[validSortBy] = validSortType;
    const results = yield service_model_1.default.aggregate([
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
    const totalRecords = yield service_model_1.default.aggregate([
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
    const total = ((_a = totalRecords[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    // console.log(total);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceRequests: results,
        pagination: {
            totalRecords: total,
            page: pageNumber,
            limit: limitNumber
        }
    }, "All Service requests retrieved successfully.");
}));
// get accepted ServiceRequest controller
exports.getAcceptedServiceRequestInJobQueue = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const results = yield service_model_1.default.aggregate([
        {
            $match: {
                requestProgress: "Pending",
                serviceProviderId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
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
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Job queue retrieved successfully.");
}));
// updateService controller
exports.cancelServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const { requestProgress, serviceId } = req.body;
    if (!serviceId || !requestProgress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID and request progress is required."));
    }
    ;
    const updatedService = yield service_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId), userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, {
        $set: {
            requestProgress: "Cancelled",
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Service not found for updating.");
    }
    ;
    if (updatedService.serviceProviderId) {
        const userFcm = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.fcmToken) || "";
        const notiTitle = "Service Requested Cancelled by Customer ";
        const notiBody = ` ${(_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.firstName) !== null && _d !== void 0 ? _d : "User"} ${(_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e.lastName) !== null && _f !== void 0 ? _f : ""} has cancelled the service request`;
        const notiData1 = {
            senderId: (_g = req.user) === null || _g === void 0 ? void 0 : _g._id,
            receiverId: updatedService.serviceProviderId,
            title: notiTitle,
            notificationType: "Customer Cancelled Service",
        };
        const notifyUser1 = yield (0, sendPushNotification_1.default)(userFcm, notiTitle, notiBody, notiData1);
    }
    return (0, response_1.sendSuccessResponse)(res, 200, "Service Request cancelled Successfully");
}));
// updateService controller
exports.addorUpdateIncentive = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { incentiveAmount, serviceId } = req.body;
    if (!serviceId || !incentiveAmount) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID, incentive check and incentive amount is required."));
    }
    ;
    const updatedService = yield service_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId), userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, {
        $set: {
            isIncentiveGiven: true,
            incentiveAmount
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Service request not found for updating.");
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, "Incentive added for the service request.");
}));
// handleServiceRequestState controller
exports.handleServiceRequestState = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    const registrationToken = "dXt8fLvzy9s:APA91bEYQH12Iu6jfsFv2I6yDd6bLfTRN6AqY6fjEDpD7YDeDRH5I7XXjWxcbPxyErmc7KjUjHiEnJ0K7yOHgdP_xUq8c9zcp6F5Bcwb0s_fi_NDszErlr3sB5P5Wf8ItvPH4ch5vwbb";
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    let userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const { serviceId } = req.params;
    const { isReqAcceptedByServiceProvider, requestProgress } = req.body;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    const serviceRequest = yield service_model_1.default.findById(serviceId);
    if (!serviceRequest) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found."));
    }
    const customerDetails = yield user_model_1.default.findById(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId);
    const serviceProviderDetails = yield user_model_1.default.findById(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.serviceProviderId).select('serviceProviderId');
    let userFcm, notiTitle, notiBody;
    let serviceProviderId = userId;
    //|| userType === "FieldAgent"
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId }).select('acceptRequest');
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.acceptRequest)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, 'Permission denied: Accept Request not granted.'));
        }
        const team = yield teams_model_1.default.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }
    ;
    if (userType === "FieldAgent") {
        if (!serviceRequest.assignedAgentId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Job is not assigned yet. Permission denied."));
        }
        ;
        console.log(serviceRequest.assignedAgentId);
        const serviceRequestAssignedAgentId = serviceRequest.assignedAgentId.toString();
        const currentuserId = userId === null || userId === void 0 ? void 0 : userId.toString();
        if (serviceRequestAssignedAgentId !== currentuserId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Permission denied: You are not assigned to this service..."));
        }
        ;
        const team = yield teams_model_1.default.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }
    const updateData = { isReqAcceptedByServiceProvider, updatedAt: Date.now() };
    if (isReqAcceptedByServiceProvider) {
        updateData.serviceProviderId = serviceProviderId;
        switch (serviceRequest.requestProgress) {
            case "NotStarted":
                console.log("case1:NotStarted");
                if (requestProgress === "Pending") {
                    updateData.requestProgress = "Pending";
                }
                userFcm = (customerDetails === null || customerDetails === void 0 ? void 0 : customerDetails.fcmToken) || "";
                notiTitle = "Service Requested Accepted ";
                notiBody = `Your Service Request is accepted by ${(_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.firstName) !== null && _d !== void 0 ? _d : "User"} ${(_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e.lastName) !== null && _f !== void 0 ? _f : ""}`;
                const notiData1 = {
                    senderId: (_g = req.user) === null || _g === void 0 ? void 0 : _g._id,
                    receiverId: serviceRequest.userId,
                    title: notiTitle,
                    notificationType: "Service Accepeted",
                };
                const notifyUser1 = yield (0, sendPushNotification_1.default)(userFcm, notiTitle, notiBody, notiData1);
                break;
            case "Pending":
                console.log("case2:Pending");
                if (requestProgress === "Started") {
                    updateData.requestProgress = "Started";
                    updateData.startedAt = new Date();
                }
                userFcm = (serviceProviderDetails === null || serviceProviderDetails === void 0 ? void 0 : serviceProviderDetails.fcmToken) || "";
                notiTitle = "Mark job as completed";
                notiBody = `${(_j = (_h = req.user) === null || _h === void 0 ? void 0 : _h.firstName) !== null && _j !== void 0 ? _j : "User"} ${(_l = (_k = req.user) === null || _k === void 0 ? void 0 : _k.lastName) !== null && _l !== void 0 ? _l : ""} has marked the job as started`;
                const notiData2 = {
                    senderId: (_m = req.user) === null || _m === void 0 ? void 0 : _m._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notiTitle,
                    notificationType: "Service Started",
                };
                const notifyUser2 = yield (0, sendPushNotification_1.default)(userFcm, notiTitle, notiBody, notiData2);
                break;
            case "Started":
                if (requestProgress === "Completed") {
                    updateData.requestProgress = "Completed";
                    updateData.completedAt = new Date();
                }
                userFcm = (serviceProviderDetails === null || serviceProviderDetails === void 0 ? void 0 : serviceProviderDetails.fcmToken) || "";
                notiTitle = "Mark job as completed";
                notiBody = `${(_p = (_o = req.user) === null || _o === void 0 ? void 0 : _o.firstName) !== null && _p !== void 0 ? _p : "User"} ${(_r = (_q = req.user) === null || _q === void 0 ? void 0 : _q.lastName) !== null && _r !== void 0 ? _r : ""} has marked the job as completed`;
                const notiData3 = {
                    senderId: (_s = req.user) === null || _s === void 0 ? void 0 : _s._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notiTitle,
                    notificationType: "Service Completed",
                };
                const notifyUser3 = yield (0, sendPushNotification_1.default)(userFcm, notiTitle, notiBody, notiData3);
                break;
            default:
                updateData.requestProgress = requestProgress;
                if (requestProgress === "Cancelled") {
                    updateData.isReqAcceptedByServiceProvider = false;
                }
                userFcm = (serviceProviderDetails === null || serviceProviderDetails === void 0 ? void 0 : serviceProviderDetails.fcmToken) || "";
                notiTitle = "Mark job as cancelled";
                notiBody = `${(_u = (_t = req.user) === null || _t === void 0 ? void 0 : _t.firstName) !== null && _u !== void 0 ? _u : "User"} ${(_w = (_v = req.user) === null || _v === void 0 ? void 0 : _v.lastName) !== null && _w !== void 0 ? _w : ""} has marked the job as cancelled`;
                const notiData4 = {
                    senderId: (_x = req.user) === null || _x === void 0 ? void 0 : _x._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notiTitle,
                    notificationType: "Agent Cancelled Service",
                };
                const notifyUser4 = yield (0, sendPushNotification_1.default)(userFcm, notiTitle, notiBody, notiData4);
                break;
        }
    }
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found for updating."));
    }
    // Calculate total duration if completedAt is available
    let totalExecutionTimeInMinutes = 0;
    if (updatedService.completedAt && updatedService.startedAt) {
        totalExecutionTimeInMinutes = (new Date(updatedService.completedAt).getTime() - new Date(updatedService.startedAt).getTime()) / (1000 * 60);
    }
    return (0, response_1.sendSuccessResponse)(res, 200, { updatedService, totalExecutionTimeInMinutes }, isReqAcceptedByServiceProvider ? "Service Request accepted successfully." : "Service Request status updated successfully.");
}));
// deleteService controller
exports.deleteService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    ;
    // Remove the Category from the database
    const deletedService = yield service_model_1.default.findByIdAndUpdate(serviceId, { $set: { isDeleted: true } });
    if (!deletedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service  not found for deleting."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Service deleted successfully");
}));
// fetch nearby ServiceRequest controller
exports.fetchServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const isNotificationOn = yield (0, auth_1.isNotificationPreferenceOn)((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
    if (!isNotificationOn) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Notification permission is off.");
    }
    const { page = "1", limit = "10", query = '', sortBy = 'isIncentiveGiven', sortType = 'desc', categoryName = '' } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isDeleted: false }, (query && {
        $or: [
            { serviceAddress: { $regex: query, $options: "i" } },
            { 'userId.firstName': { $regex: query, $options: "i" } },
            { 'userId.lastName': { $regex: query, $options: "i" } },
            { 'categoryDetails.name': { $regex: query, $options: "i" } },
        ]
    }));
    const validSortBy = sortBy || 'isIncentiveGiven' || 'incentiveAmount';
    const validSortType = sortType.toLowerCase() === 'desc' ? -1 : 1;
    const sortCriteria = {};
    sortCriteria[validSortBy] = validSortType;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const userType = (_c = req.user) === null || _c === void 0 ? void 0 : _c.userType;
    let serviceProviderId;
    let address;
    if (userType === 'TeamLead') {
        const team = yield teams_model_1.default.aggregate([
            {
                $match: {
                    isDeleted: false,
                    fieldAgentIds: userId
                }
            }
        ]);
        if (team.length === 0) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Team not found.'));
        }
        serviceProviderId = team[0].serviceProviderId;
        if (!serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Service Provider ID not found in team.'));
        }
        address = yield address_model_1.default.findOne({ userId: serviceProviderId });
    }
    else {
        address = yield address_model_1.default.findOne({ userId });
    }
    if (!address || !address.zipCode || !address.longitude || !address.latitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'User\'s location not found.'));
    }
    const longitude = address.longitude;
    const latitude = address.latitude;
    // Extract coordinates and validate
    const serviceRequestLongitude = parseFloat(longitude);
    const serviceRequestLatitude = parseFloat(latitude);
    if (isNaN(serviceRequestLongitude) || isNaN(serviceRequestLatitude)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `Invalid longitude or latitude`));
    }
    const radius = 400000000; // in meters
    const serviceRequests = yield service_model_1.default.aggregate([
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
        return (0, response_1.sendSuccessResponse)(res, 200, serviceRequests, 'No nearby service request found');
    }
    const total = serviceRequests[0] ? serviceRequests.length : 0;
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceRequests, pagination: {
            totalRecords: total,
            page: pageNumber,
            limit: limitNumber
        }
    }, 'Service requests fetched successfully');
}));
//fetch nearby service provider 
exports.fetchNearByServiceProvider = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceRequestId } = req.params;
    if (!serviceRequestId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `Invalid ServiceRequest ID`));
    }
    const serviceRequest = yield service_model_1.default.findById(serviceRequestId);
    if (!serviceRequest) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `Service request not found`));
    }
    // Extract coordinates and validate
    const serviceRequestLongitude = parseFloat(serviceRequest.serviceLongitude);
    const serviceRequestLatitude = parseFloat(serviceRequest.serviceLatitude);
    if (isNaN(serviceRequestLongitude) || isNaN(serviceRequestLatitude)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `Invalid longitude or latitude`));
    }
    const radius = 40000; // Radius in meters
    const pipeline = [
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
    const serviceProviders = yield user_model_1.default.aggregate(pipeline);
    if (!serviceProviders.length) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'No nearby service providers found.'));
    }
    const updatePayload = {
        isReqAcceptedByServiceProvider: true,
        requestProgress: 'Pending',
        serviceProviderId: serviceProviders[0]._id
    };
    const acceptRequest = yield service_model_1.default.findByIdAndUpdate({ _id: serviceRequestId }, updatePayload, { new: true });
    return (0, response_1.sendSuccessResponse)(res, 200, serviceProviders[0], 'Nearby Service Providers assigned successfully');
}));
// fetchSingleServiceRequest controller
exports.fetchSingleServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service request ID is required."));
    }
    ;
    const serviceRequestToFetch = yield service_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose_1.default.Types.ObjectId(serviceId)
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
                'serviceProviderAvatar': "$serviceProviderId.avatar ",
                'serviceProviderPhone': "$serviceProviderId.phone",
                'serviceProviderCompanyName': "$serviceProviderId.providerAdditionalInfo.companyName",
                'serviceProviderCompanyDesc': "$serviceProviderId.providerAdditionalInfo.companyIntroduction",
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
    return (0, response_1.sendSuccessResponse)(res, 200, serviceRequestToFetch, "Service request retrieved successfully.");
}));
// Function to fetch associated customer with the service request
const fetchAssociatedCustomer = (serviceId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!serviceId) {
        throw new Error("Service request ID is required.");
    }
    const serviceRequest = yield service_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose_1.default.Types.ObjectId(serviceId),
            },
        },
    ]);
    if (!serviceRequest || serviceRequest.length === 0) {
        throw new Error("Service request not found.");
    }
    return serviceRequest[0].userId;
});
exports.fetchAssociatedCustomer = fetchAssociatedCustomer;
//get service request for customer
exports.getServiceRequestByStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "InProgress"
        ? { requestProgress: { $in: ["Pending", "Started"] } }
        : requestProgress === "jobQueue"
            ? { requestProgress: "NotStarted" }
            : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { userId: userId })
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
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
}));
//get service request for service provider
exports.getJobByStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "Accepted"
        ? { requestProgress: { $in: ["Pending",] } }
        : requestProgress === "Started"
            ? { requestProgress: "Started" }
            : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { serviceProviderId: serviceProviderId })
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
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
}));
//get service request for field agent
exports.getJobByStatusByAgent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // console.log(req.user?._id);
    const assignedAgentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "Assigned" ? { requestProgress: "Pending", assignedAgentId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id }
        : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { assignedAgentId: assignedAgentId })
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
                customerAvatar: '$userId.avatar',
                totalCustomerRatings: '$userId.totalRatings',
                customerAvgRating: '$userId.userAvgRating',
                createdAt: 1
            }
        },
        { $sort: { createdAt: -1 } },
    ]);
    const totalRequest = results.length;
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
}));
exports.assignJob = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    let serviceProviderId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const { assignedAgentId, serviceId } = req.body;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    ;
    let isAssignable = true;
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id }).select('assignJob');
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.fieldAgentManagement)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, 'Permission denied: Assign Job not granted.'));
        }
        // const teamInfo = await TeamModel.findOne({ fieldAgentIds: req.user?._id });
        // if (teamInfo) {
        //     serviceProviderId = teamInfo?.serviceProviderId;
        // }
        // const agentUser = await UserModel.findById(assignedAgentId).select('userType');
        // isAssignable = agentUser?.userType === "FieldAgent" || agentUser?.userType === "TeamLead";
    }
    ;
    // if (!isAssignable) {
    //     return sendErrorResponse(res, new ApiError(403, "Assigned agent must be a FieldAgent."));
    // };
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, {
        $set: {
            assignedAgentId: new mongoose_1.default.Types.ObjectId(assignedAgentId),
            // serviceProviderId: serviceProviderId
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found for assigning."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedService, "Job assigned to the agent successfully.");
}));
exports.totalJobCount = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service provider ID is required."));
    }
    ;
    const jobData = yield service_model_1.default.aggregate([
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
    return (0, response_1.sendSuccessResponse)(res, 200, jobData, "Job counts retrieved successfully.");
}));
exports.fetchAssignedserviceProvider = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    ;
    const assignedSPDetails = yield service_model_1.default.aggregate([
        {
            $match: {
                _id: new mongoose_1.default.Types.ObjectId(serviceId)
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
    return (0, response_1.sendSuccessResponse)(res, 200, assignedSPDetails[0], "Assigned service provider retrieved successfully.");
}));
