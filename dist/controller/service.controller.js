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
exports.fetchIncentiveDetails = exports.fetchServiceAddressHistory = exports.getCompletedService = exports.fetchAssignedserviceProvider = exports.totalJobCount = exports.assignJob = exports.getJobByStatusByAgent = exports.getJobByStatus = exports.getServiceRequestByStatus = exports.fetchAssociatedCustomer = exports.fetchSingleServiceRequest = exports.fetchNearByServiceProvider = exports.fetchServiceRequest = exports.deleteService = exports.handleServiceRequestState = exports.addorUpdateIncentive = exports.cancelServiceRequest = exports.getAcceptedServiceRequestInJobQueue = exports.getServiceRequestList = exports.addService = void 0;
exports.isCancellationFeeApplicable = isCancellationFeeApplicable;
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
const sendPushNotification_1 = require("../utils/sendPushNotification");
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const testFcm = "fVSB8tntRb2ufrLcySfGxs:APA91bH3CCLoxCPSmRuTo4q7j0aAxWLCdu6WtAdBWogzo79j69u8M_qFwcNygw7LIGrLYBXFqz2SUZI-4js8iyHxe12BMe-azVy2v7d22o4bvxy2pzTZ4kE";
//is cancellation fee is applicable or not
function isCancellationFeeApplicable(serviceId) {
    return __awaiter(this, void 0, void 0, function* () {
        let serviceDeatils = yield service_model_1.default.findById(serviceId);
        let requestProgress = "", isCancellationFeeApplicable = false;
        requestProgress = (serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.requestProgress) || "";
        var serviceStartDate = serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.serviceStartDate;
        if (requestProgress === "Pending" || requestProgress === "CancelledBySP") {
            const givenTimestamp = serviceStartDate && new Date(serviceStartDate);
            console.log({ givenTimestamp });
            const currentTimestamp = new Date();
            const diffInMilliseconds = givenTimestamp && givenTimestamp.getTime() - currentTimestamp.getTime();
            const diffInHours = diffInMilliseconds
                ? diffInMilliseconds / (1000 * 60 * 60)
                : 0;
            console.log(diffInHours, "diffInHours");
            if (diffInHours < 24) {
                console.log("triggered");
                isCancellationFeeApplicable = true;
            }
        }
        else if (requestProgress === "Started" ||
            requestProgress === "Completed" ||
            requestProgress === "CancelledByFA") {
            isCancellationFeeApplicable = true;
        }
        return isCancellationFeeApplicable;
    });
}
// addService controller
exports.addService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let locationDetails, finalLongitude, finalLatitude, finalLocation;
    const { categoryId, serviceStartDate, serviceShifftId, SelectedShiftTime, serviceZipCode, serviceAddress, serviceLatitude, serviceLongitude, useMyCurrentLocation, serviceLandMark, userPhoneNumber, isIncentiveGiven, incentiveAmount, isTipGiven, tipAmount, otherInfo, serviceProductImage, answerArray, serviceAddressId, // Expecting answerArray instead of answers
     } = req.body;
    // console.log(req.body);
    // Validate required fields
    if (!categoryId)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category ID is required."));
    if (!serviceStartDate)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service start date is required."));
    if (!serviceShifftId)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service shift ID is required."));
    if (!SelectedShiftTime)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Selected shift time is required."));
    if (!answerArray || !Array.isArray(answerArray))
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Answer array is required and must be an array."));
    if (useMyCurrentLocation) {
        if (!serviceLatitude || !serviceLongitude)
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service latitude and longitude is required."));
        if (!serviceAddress)
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service address is required."));
        finalLongitude = serviceLongitude;
        finalLatitude = serviceLatitude;
        finalLocation = {
            type: "Point",
            coordinates: [finalLongitude, finalLatitude], // [longitude, latitude]
        };
    }
    // **Step 1: Check the count of unique pre-saved addresses for the user**
    const existingAddresses = yield service_model_1.default.aggregate([
        { $match: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id } },
        {
            $group: {
                _id: { serviceAddress: "$serviceAddress" },
                count: { $sum: 1 },
            },
        },
    ]);
    if (existingAddresses.length >= 6) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "You cannot have more than six pre-saved addresses."));
    }
    // Conditional checks for incentive and tip amounts
    if (isIncentiveGiven &&
        (incentiveAmount === undefined || incentiveAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Incentive amount must be provided and more than zero if incentive is given."));
    }
    if (isTipGiven && (tipAmount === undefined || tipAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Tip amount must be provided and more than zero if tip is given."));
    }
    if (!serviceAddressId) {
        if (!useMyCurrentLocation) {
            if (!serviceZipCode)
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ZIP code is required for manual address."));
            if (!serviceAddress)
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service address  is required for manual address."));
            //extracting coordinates from zip code
            const apiKey = process.env.GOOGLE_API_KEY;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${serviceZipCode}&key=${apiKey}`;
            const geocodeResponse = yield axios_1.default.get(geocodeUrl);
            locationDetails = (_b = geocodeResponse === null || geocodeResponse === void 0 ? void 0 : geocodeResponse.data) === null || _b === void 0 ? void 0 : _b.results[0];
            if (!locationDetails)
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ZIP code is invalid."));
            let fetchedCoordinates = {
                longitude: (_d = (_c = locationDetails === null || locationDetails === void 0 ? void 0 : locationDetails.geometry) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.lng,
                latitude: (_f = (_e = locationDetails === null || locationDetails === void 0 ? void 0 : locationDetails.geometry) === null || _e === void 0 ? void 0 : _e.location) === null || _f === void 0 ? void 0 : _f.lat,
            };
            finalLongitude = fetchedCoordinates.longitude;
            finalLatitude = fetchedCoordinates.latitude;
            finalLocation = {
                type: "Point",
                coordinates: [finalLongitude, finalLatitude], // [longitude, latitude]
            };
        }
    }
    if (serviceAddressId) {
        const previouslybookedAddress = yield service_model_1.default.findOne({
            _id: serviceAddressId,
        }).select("serviceLatitude serviceLongitude location");
        // console.log(previouslybookedAddress);
        if (previouslybookedAddress) {
            finalLongitude = previouslybookedAddress.serviceLongitude;
            finalLatitude = previouslybookedAddress.serviceLatitude;
        }
        finalLocation = {
            type: "Point",
            coordinates: [finalLongitude, finalLatitude], // [longitude, latitude]
        };
    }
    // Prepare the new service object
    const newService = yield service_model_1.default.create({
        categoryId,
        serviceShifftId,
        SelectedShiftTime,
        serviceStartDate,
        useMyCurrentLocation,
        serviceZipCode,
        serviceLatitude: finalLatitude,
        serviceLongitude: finalLongitude,
        serviceAddress: serviceAddress,
        serviceLandMark: serviceLandMark,
        location: finalLocation,
        isIncentiveGiven,
        incentiveAmount,
        isTipGiven,
        tipAmount,
        otherInfo,
        answerArray,
        serviceProductImage,
        userId: (_g = req.user) === null || _g === void 0 ? void 0 : _g._id,
    });
    if (userPhoneNumber) {
        const addNumber = yield user_model_1.default.findByIdAndUpdate({
            userId: (_h = req.user) === null || _h === void 0 ? void 0 : _h._id,
        }, {
            $set: {
                phone: userPhoneNumber,
            },
        });
    }
    if (!newService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while creating the Service Request."));
    }
    return (0, response_1.sendSuccessResponse)(res, 201, newService, "Service Request added Successfully");
}));
// getServiceRequestList controller
exports.getServiceRequestList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { page = "1", limit = "10", query = "", sortBy = "createdAt", sortType = "desc", } = req.query;
    console.log(req.query);
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isDeleted: false }, (query && {
        $or: [
            { "userId.firstName": { $regex: query, $options: "i" } },
            { "userId.lastName": { $regex: query, $options: "i" } },
            { requestProgress: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    }));
    const validSortBy = sortBy || "createdAt";
    const validSortType = sortType.toLowerCase() === "desc" ? -1 : 1;
    const sortCriteria = {};
    sortCriteria[validSortBy] = validSortType;
    const results = yield service_model_1.default.aggregate([
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
            },
        },
        { $unwind: "$userId" },
        { $match: searchQuery },
        { $sort: { createdAt: validSortType } },
        { $skip: skip },
        { $limit: limitNumber },
        {
            $project: {
                _id: 1,
                serviceStartDate: 1,
                requestProgress: 1,
                tipAmount: 1,
                "userId.firstName": 1,
                "userId.lastName": 1,
                // userName: { $concat: ["$userId.firstName", " ", "$userId.lastName"] },
                createdAt: 1,
            },
        },
    ]);
    // console.log({ results });
    const totalRecords = yield service_model_1.default.aggregate([
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
            },
        },
        { $unwind: "$userId" },
        { $match: searchQuery },
        { $count: "total" },
        { $sort: { updatedAt: -1 } },
    ]);
    const total = ((_a = totalRecords[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    // console.log(total);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceRequests: results,
        pagination: {
            totalRecords: total,
            page: pageNumber,
            limit: limitNumber,
        },
    }, "All Service requests retrieved successfully.");
}));
// get accepted ServiceRequest controller
exports.getAcceptedServiceRequestInJobQueue = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(yield isCancellationFeeApplicable("67d27d035ddbaf78d6bea182"));
    const { page = "1", limit = "10", query = "" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isUserBanned: false }, (query && {
        $or: [
            { customerName: { $regex: query, $options: "i" } },
            { requestProgress: { $regex: query, $options: "i" } },
        ],
    }));
    const results = yield service_model_1.default.aggregate([
        {
            $match: {
                $or: [
                    { requestProgress: "Pending" },
                    { requestProgress: "CancelledByFA" },
                ],
                assignedAgentId: null,
                serviceProviderId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
                isReqAcceptedByServiceProvider: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
                pipeline: [
                    {
                        $lookup: {
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings",
                        },
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: {
                                $ifNull: [{ $avg: "$userRatings.rating" }, 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryDetails",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryDetails",
            },
        },
        {
            $project: {
                categoryName: "$categoryDetails.name",
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"],
                },
                distance: 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                requestProgress: 1,
                totalRatings: "$userId.totalRatings",
                userAvgRating: "$userId.userAvgRating",
                userAvtar: "$userId.avatar",
                isUserBanned: "$userId.isDeleted",
                serviceProviderId: 1,
                updatedAt: 1,
            },
        },
        // {
        //     $match: {
        //         isUserBanned: false
        //     }
        // },
        { $match: searchQuery },
        { $skip: skip },
        { $limit: limitNumber },
        { $sort: { updatedAt: 1 } },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        results,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Job queue retrieved successfully.");
}));
// updateService controller by customer
exports.cancelServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { requestProgress, serviceId, cancellationReason, } = req.body;
    console.log(req.body);
    if (!serviceId || !requestProgress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID and request progress are required."));
    }
    const serviceDetails = yield service_model_1.default.findById(serviceId);
    if (!serviceDetails) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found."));
    }
    let isChragesAppicable = yield isCancellationFeeApplicable(serviceId);
    if (isChragesAppicable) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Service starts within 24 hours. A cancellation fee of 25% will be charged."));
    }
    const updatedService = yield service_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId), userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, {
        $set: {
            requestProgress: "Blocked",
            cancelledBy: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
            cancellationReason: cancellationReason,
            serviceProviderId: null,
            assignedAgentId: null,
        },
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Service not found for updating.");
    }
    if (updatedService.serviceProviderId) {
        const userFcm = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.fcmToken) || "";
        const notiTitle = "Service Requested Cancelled by Customer ";
        const notiBody = `${(_e = (_d = req.user) === null || _d === void 0 ? void 0 : _d.firstName) !== null && _e !== void 0 ? _e : "User"} ${(_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.lastName) !== null && _g !== void 0 ? _g : ""} has cancelled the service request`;
        const notiData1 = {
            senderId: (_h = req.user) === null || _h === void 0 ? void 0 : _h._id,
            receiverId: updatedService.serviceProviderId,
            title: notiTitle,
            notificationType: "Customer Cancelled Service",
        };
        // const notifyUser1 = await sendNotification(userFcm, notiTitle, notiBody, notiData1)
    }
    return (0, response_1.sendSuccessResponse)(res, 200, "Service Request cancelled Successfully");
}));
// updateService controller
exports.addorUpdateIncentive = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { incentiveAmount, serviceId, } = req.body;
    if (!serviceId || !incentiveAmount) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID, incentive check and incentive amount is required."));
    }
    const updatedService = yield service_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId), userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, {
        $set: {
            isIncentiveGiven: true,
            incentiveAmount,
        },
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Service request not found for updating.");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, "Incentive added for the service request.");
}));
exports.handleServiceRequestState = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    let userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const { serviceId } = req.params;
    const { isReqAcceptedByServiceProvider, requestProgress, } = req.body;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    const serviceRequest = yield service_model_1.default.findById(serviceId);
    if (!serviceRequest) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found."));
    }
    const customerDetails = yield user_model_1.default.findById(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId);
    const serviceProviderDetails = yield user_model_1.default.findById(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.serviceProviderId).select("serviceProviderId");
    let serviceProviderId = userId;
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId }).select("acceptRequest");
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.acceptRequest)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Permission denied: Accept Request not granted."));
        }
        const team = yield teams_model_1.default.findOne({
            isDeleted: false,
            fieldAgentIds: userId,
        }).select("serviceProviderId");
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider ID not found for team."));
        }
        serviceProviderId = team.serviceProviderId;
    }
    if (userType === "FieldAgent") {
        if (!serviceRequest.assignedAgentId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Job is not assigned yet. Permission denied."));
        }
        if (serviceRequest.assignedAgentId.toString() !== (userId === null || userId === void 0 ? void 0 : userId.toString())) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Permission denied: You are not assigned to this service."));
        }
        const team = yield teams_model_1.default.findOne({
            isDeleted: false,
            fieldAgentIds: userId,
        }).select("serviceProviderId");
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider ID not found for team."));
        }
        serviceProviderId = team.serviceProviderId;
    }
    const updateData = {
        isReqAcceptedByServiceProvider,
        updatedAt: Date.now(),
    };
    if (isReqAcceptedByServiceProvider) {
        updateData.serviceProviderId = serviceProviderId;
        //a newly created service request or a service cancelled by sp can be accepted again by SPs
        if (serviceRequest.requestProgress === "NotStarted" ||
            serviceRequest.requestProgress === "CancelledBySP") {
            if (requestProgress === "Pending") {
                const spWalletDetails = yield wallet_model_1.default.findOne({ userId });
                if (!spWalletDetails) {
                    return res.status(400).json({
                        message: "User does not have a connected Wallet account",
                    });
                }
                if ((spWalletDetails === null || spWalletDetails === void 0 ? void 0 : spWalletDetails.balance) <= 200) {
                    return res.status(400).json({ message: "Insufficient balance" });
                }
                updateData.requestProgress = "Pending";
                updateData.acceptedAt = Date.now();
            }
            const notificationContent = `Your Service Request is accepted by ${(_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c.firstName) !== null && _d !== void 0 ? _d : "User"} ${(_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e.lastName) !== null && _f !== void 0 ? _f : ""}`;
            yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
            // userId?.toString() as string,
            "Service Request Accepted", notificationContent, {
                senderId: (_g = req.user) === null || _g === void 0 ? void 0 : _g._id,
                receiverId: serviceRequest.userId,
                title: notificationContent,
                notificationType: "Service Accepted",
            });
        }
        //if a service is in accepted mode or CancelledByFA mode then one can start that service by assigning FA...
        if ((serviceRequest.requestProgress === "Pending" ||
            serviceRequest.requestProgress === "CancelledByFA") &&
            requestProgress === "Started") {
            updateData.requestProgress = "Started";
            updateData.startedAt = new Date();
            const notificationContent = `${(_j = (_h = req.user) === null || _h === void 0 ? void 0 : _h.firstName) !== null && _j !== void 0 ? _j : "User"} ${(_l = (_k = req.user) === null || _k === void 0 ? void 0 : _k.lastName) !== null && _l !== void 0 ? _l : ""} has marked the job as started`;
            if (((_m = req.user) === null || _m === void 0 ? void 0 : _m.userType) === "ServiceProvider") {
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
                // userId?.toString() as string,
                "Mark job as started", notificationContent, {
                    senderId: (_o = req.user) === null || _o === void 0 ? void 0 : _o._id,
                    receiverId: serviceRequest.userId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
            }
            else if (((_p = req.user) === null || _p === void 0 ? void 0 : _p.userType) === "FieldAgent") {
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.serviceProviderId.toString(), 
                // userId?.toString() as string,
                "Mark job as started", notificationContent, {
                    senderId: (_q = req.user) === null || _q === void 0 ? void 0 : _q._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
                // userId?.toString() as string,
                "Mark job as started", notificationContent, {
                    senderId: (_r = req.user) === null || _r === void 0 ? void 0 : _r._id,
                    receiverId: serviceRequest.userId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
            }
        }
        if (serviceRequest.requestProgress === "Started" &&
            requestProgress === "Completed") {
            updateData.requestProgress = "Completed";
            updateData.completedAt = new Date();
            const notificationContent = `${(_t = (_s = req.user) === null || _s === void 0 ? void 0 : _s.firstName) !== null && _t !== void 0 ? _t : "User"} ${(_v = (_u = req.user) === null || _u === void 0 ? void 0 : _u.lastName) !== null && _v !== void 0 ? _v : ""} has marked the job as completed`;
            if (((_w = req.user) === null || _w === void 0 ? void 0 : _w.userType) === "ServiceProvider") {
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
                // userId?.toString() as string,
                "Mark job as completed", notificationContent, {
                    senderId: (_x = req.user) === null || _x === void 0 ? void 0 : _x._id,
                    receiverId: serviceRequest.userId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
            }
            else if (((_y = req.user) === null || _y === void 0 ? void 0 : _y.userType) === "FieldAgent") {
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.serviceProviderId.toString(), 
                // userId?.toString() as string,
                "Mark job as completed", notificationContent, {
                    senderId: (_z = req.user) === null || _z === void 0 ? void 0 : _z._id,
                    receiverId: serviceRequest.serviceProviderId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
                yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
                // userId?.toString() as string,
                "Mark job as completed", notificationContent, {
                    senderId: (_0 = req.user) === null || _0 === void 0 ? void 0 : _0._id,
                    receiverId: serviceRequest.userId,
                    title: notificationContent,
                    notificationType: "Service Started",
                });
            }
        }
    }
    if (serviceRequest.requestProgress !== "NotStarted" &&
        requestProgress === "Cancelled") {
        if (userType === "ServiceProvider") {
            (updateData.requestProgress = "CancelledBySP"),
                (updateData.isReqAcceptedByServiceProvider = false);
            updateData.cancelledBy = (_1 = req.user) === null || _1 === void 0 ? void 0 : _1._id;
            updateData.serviceProviderId = null;
            const notificationContent = `${(_3 = (_2 = req.user) === null || _2 === void 0 ? void 0 : _2.firstName) !== null && _3 !== void 0 ? _3 : "User"} ${(_5 = (_4 = req.user) === null || _4 === void 0 ? void 0 : _4.lastName) !== null && _5 !== void 0 ? _5 : ""} has marked the job as cancelled`;
            yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.userId.toString(), 
            // userId?.toString() as string,
            "Mark job as cancelled", notificationContent, {
                senderId: (_6 = req.user) === null || _6 === void 0 ? void 0 : _6._id,
                receiverId: serviceRequest.userId,
                title: notificationContent,
                notificationType: "Service Started",
            });
        }
        if (userType === "FieldAgent") {
            (updateData.requestProgress = "CancelledByFA"),
                (updateData.cancelledBy = (_7 = req.user) === null || _7 === void 0 ? void 0 : _7._id);
            updateData.assignedAgentId = null;
            const notificationContent = `${(_9 = (_8 = req.user) === null || _8 === void 0 ? void 0 : _8.firstName) !== null && _9 !== void 0 ? _9 : "User"} ${(_11 = (_10 = req.user) === null || _10 === void 0 ? void 0 : _10.lastName) !== null && _11 !== void 0 ? _11 : ""} has marked the job as cancelled`;
            yield (0, sendPushNotification_1.sendPushNotification)(serviceRequest === null || serviceRequest === void 0 ? void 0 : serviceRequest.serviceProviderId.toString(), "Mark job as cancelled", notificationContent, {
                senderId: (_12 = req.user) === null || _12 === void 0 ? void 0 : _12._id,
                receiverId: serviceRequest.serviceProviderId,
                title: notificationContent,
                notificationType: "Service Cancelled",
            });
        }
    }
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found for updating."));
    }
    if (requestProgress === "Pending") {
        return (0, response_1.sendSuccessResponse)(res, 200, { updatedService }, "Service request accepted successfully.");
    }
    if (requestProgress === "Started") {
        return (0, response_1.sendSuccessResponse)(res, 200, { updatedService }, "Service request started successfully.");
    }
    if (requestProgress === "Completed") {
        let totalExecutionTimeInMinutes = 0;
        if (updatedService.completedAt && updatedService.startedAt) {
            totalExecutionTimeInMinutes =
                (new Date(updatedService.completedAt).getTime() -
                    new Date(updatedService.startedAt).getTime()) /
                    (1000 * 60);
        }
        return (0, response_1.sendSuccessResponse)(res, 200, { updatedService, totalExecutionTimeInMinutes }, "Service request completed successfully.");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, { updatedService }, "Service request cancelled successfully.");
}));
// deleteService controller
exports.deleteService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    // Remove the Category from the database
    const deletedService = yield service_model_1.default.findByIdAndUpdate(serviceId, {
        $set: { isDeleted: true },
    });
    if (!deletedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service  not found for deleting."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Service deleted successfully");
}));
// fetch nearby ServiceRequest controller
exports.fetchServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { page = "1", limit = "10", query = "", sortBy = "isIncentiveGiven", sortType = "desc", categoryName = "", } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isDeleted: false }, (query && {
        $or: [
            { serviceAddress: { $regex: query, $options: "i" } },
            { "userId.firstName": { $regex: query, $options: "i" } },
            { "userId.lastName": { $regex: query, $options: "i" } },
            { "categoryDetails.name": { $regex: query, $options: "i" } },
        ],
    }));
    const validSortBy = sortBy || "isIncentiveGiven" || "incentiveAmount";
    const validSortType = sortType.toLowerCase() === "desc" ? -1 : 1;
    const sortCriteria = {};
    sortCriteria[validSortBy] = validSortType;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userType;
    let serviceProviderId;
    let address;
    if (userType === "TeamLead") {
        const team = yield teams_model_1.default.aggregate([
            {
                $match: {
                    isDeleted: false,
                    fieldAgentIds: userId,
                },
            },
        ]);
        if (team.length === 0) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Team not found."));
        }
        serviceProviderId = team[0].serviceProviderId;
        if (!serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider ID not found in team."));
        }
        address = yield address_model_1.default.findOne({ userId: serviceProviderId });
    }
    else {
        address = yield address_model_1.default.findOne({ userId });
    }
    if (!address ||
        !address.zipCode ||
        !address.longitude ||
        !address.latitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User's location not found."));
    }
    const longitude = address.longitude;
    const latitude = address.latitude;
    // Extract coordinates and validate
    const serviceProviderLongitude = parseFloat(longitude);
    const serviceProviderLatitude = parseFloat(latitude);
    if (isNaN(serviceProviderLongitude) || isNaN(serviceProviderLatitude)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `Invalid longitude or latitude`));
    }
    const radius = 400000000; // in meters
    const serviceRequests = yield service_model_1.default.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [serviceProviderLongitude, serviceProviderLatitude],
                },
                distanceField: "distance",
                spherical: true,
                maxDistance: radius,
            },
        },
        {
            $match: {
                isDeleted: false,
                isReqAcceptedByServiceProvider: false,
                $or: [
                    { requestProgress: "NotStarted" },
                    { requestProgress: "CancelledBySP" },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
                pipeline: [
                    {
                        $lookup: {
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings",
                        },
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: {
                                $ifNull: [{ $avg: "$userRatings.rating" }, 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryDetails",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryDetails",
            },
        },
        { $match: searchQuery },
        // { $sort: { isIncentiveGiven: validSortType } },
        {
            $project: {
                categoryName: "$categoryDetails.name",
                LeadGenerationFee: {
                    $floor: {
                        $multiply: [{ $toDouble: "$categoryDetails.serviceCost" }, 0.25],
                    },
                },
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"],
                },
                distance: 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                requestProgress: 1,
                totalRatings: "$userId.totalRatings",
                userAvgRating: "$userId.userAvgRating",
                userAvtar: "$userId.avatar",
                isUserBanned: "$userId.isDeleted",
                createdAt: 1,
            },
        },
        {
            $match: {
                isUserBanned: false,
            },
        },
        { $skip: skip },
        { $limit: limitNumber },
        { $sort: { createdAt: -1, isIncentiveGiven: -1, incentiveAmount: -1 } },
    ]);
    if (!serviceRequests.length) {
        return (0, response_1.sendSuccessResponse)(res, 200, serviceRequests, "No nearby service request found");
    }
    const totalRecords = yield service_model_1.default.countDocuments({
        isDeleted: false,
        isReqAcceptedByServiceProvider: false,
        $or: [
            { requestProgress: "NotStarted" },
            { requestProgress: "CancelledBySP" },
        ],
    });
    // const total = serviceRequests[0] ? serviceRequests.length : 0
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceRequests,
        pagination: {
            totalRecords: totalRecords,
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Service requests fetched successfully");
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
                near: {
                    type: "Point",
                    coordinates: [serviceRequestLongitude, serviceRequestLatitude],
                },
                distanceField: "distance",
                spherical: true,
                maxDistance: radius,
                query: {
                    userType: "ServiceProvider",
                    isDeleted: false,
                },
            },
        },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "_id",
                as: "additionalInfo",
            },
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                "additionalInfo.__v": 0,
                "additionalInfo.isDeleted": 0,
            },
        },
        // {
        //     $sort: { distance: -1 }
        // }
    ];
    const serviceProviders = (yield user_model_1.default.aggregate(pipeline));
    if (!serviceProviders.length) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No nearby service providers found."));
    }
    const updatePayload = {
        isReqAcceptedByServiceProvider: true,
        requestProgress: "Pending",
        serviceProviderId: serviceProviders[0]._id,
    };
    const acceptRequest = yield service_model_1.default.findByIdAndUpdate({ _id: serviceRequestId }, updatePayload, { new: true });
    return (0, response_1.sendSuccessResponse)(res, 200, serviceProviders[0], "Nearby Service Providers assigned successfully");
}));
// fetchSingleServiceRequest controller
exports.fetchSingleServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service request ID is required."));
    }
    const serviceRequestToFetch = yield service_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose_1.default.Types.ObjectId(serviceId),
            },
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
        },
        {
            $unwind: {
                // preserveNullAndEmptyArrays: true,
                path: "$categoryId",
            },
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
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings",
                        },
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: {
                                $ifNull: [{ $avg: "$userRatings.rating" }, 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
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
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId",
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "assignedAgentId",
                as: "assignedAgentId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$assignedAgentId",
            },
        },
        {
            $lookup: {
                from: "shifts",
                foreignField: "_id",
                localField: "serviceShifftId",
                as: "serviceShifftId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceShifftId",
            },
        },
        {
            $addFields: {
                bookedTimeSlot: {
                    $filter: {
                        input: "$serviceShifftId.shiftTimes",
                        as: "shiftTime",
                        cond: {
                            $eq: ["$$shiftTime._id", "$SelectedShiftTime.shiftTimeId"],
                        },
                    },
                },
            },
        },
        {
            $project: {
                categoryName: "$categoryId.name",
                LeadGenerationFee: {
                    $floor: {
                        $multiply: [{ $toDouble: "$categoryId.serviceCost" }, 0.25],
                    },
                },
                bookedServiceShift: "$serviceShifftId.shiftName",
                bookedTimeSlot: 1,
                serviceStartDate: 1,
                customerId: "$userId._id",
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"],
                },
                customerEmail: "$userId.email",
                customerAvatar: "$userId.avatar",
                customerPhone: "$userId.phone",
                totalCustomerRatings: "$userId.totalRatings",
                customerAvgRating: "$userId.userAvgRating",
                serviceProviderName: {
                    $concat: [
                        "$serviceProviderId.firstName",
                        " ",
                        "$serviceProviderId.lastName",
                    ],
                },
                serviceProviderID: "$serviceProviderId._id",
                serviceProviderEmail: "$serviceProviderId.email",
                serviceProviderAvatar: "$serviceProviderId.avatar",
                serviceProviderPhone: "$serviceProviderId.phone",
                serviceProviderCompanyName: "$serviceProviderId.providerAdditionalInfo.companyName",
                serviceProviderCompanyDesc: "$serviceProviderId.providerAdditionalInfo.companyIntroduction",
                serviceProviderBusinessImage: "$serviceProviderId.providerAdditionalInfo.businessImage",
                assignedAgentName: {
                    $concat: [
                        "$assignedAgentId.firstName",
                        " ",
                        "$assignedAgentId.lastName",
                    ],
                },
                assignedAgentID: "$assignedAgentId._id",
                assignedAgentEmail: "$assignedAgentId.email",
                assignedAgentAvatar: "$assignedAgentId.avatar",
                assignedAgentPhone: "$assignedAgentId.phone",
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
                serviceLongitude: 1,
                startedAt: 1,
                completedAt: 1,
                acceptedAt: 1,
            },
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
    const { page = "1", limit = "10", query = "" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({}, (query && {
        $or: [
            { requestProgress: { $regex: query, $options: "i" } },
            { serviceAddress: { $regex: query, $options: "i" } },
            { "categoryId.name": { $regex: query, $options: "i" } },
        ],
    }));
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "InProgress"
        ? { requestProgress: { $in: ["Pending", "Started"] } }
        : requestProgress === "jobQueue"
            ? { requestProgress: { $in: ["NotStarted", "CancelledBySP"] } }
            : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { userId: userId }),
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
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
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "customerRatings",
                        },
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$customerRatings" },
                            customerAvgRating: {
                                $cond: {
                                    if: { $gt: [{ $size: "$customerRatings" }, 0] },
                                    then: { $avg: "$customerRatings.rating" },
                                    else: 0,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
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
                        },
                    },
                    {
                        $lookup: {
                            from: "additionalinfos",
                            foreignField: "userId",
                            localField: "_id",
                            as: "serviceProviderAdditionalInfo",
                        },
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$serviceProviderIdRatings" },
                            serviceProviderRatings: {
                                $cond: {
                                    if: { $gt: [{ $size: "$serviceProviderIdRatings" }, 0] },
                                    then: { $avg: "$serviceProviderIdRatings.rating" },
                                    else: 0,
                                },
                            },
                            spBusinessImage: "$serviceProviderAdditionalInfo.businessImage",
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId",
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "assignedAgentId",
                as: "assignedAgentId",
                pipeline: [
                    {
                        $lookup: {
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "fieldAgentRatings",
                        },
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$fieldAgentRatings" },
                            filedAgentRatings: {
                                $cond: {
                                    if: { $gt: [{ $size: "$fieldAgentRatings" }, 0] },
                                    then: { $avg: "$fieldAgentRatings.rating" },
                                    else: 0,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$assignedAgentId",
            },
        },
        {
            $project: {
                _id: 1,
                "categoryId.name": 1,
                "categoryId.categoryImage": 1,
                serviceStartDate: 1,
                serviceAddress: 1,
                startedAt: 1,
                completedAt: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                requestProgress: 1,
                "serviceProviderId.firstName": 1,
                "serviceProviderId.lastName": 1,
                "serviceProviderId.avatar": 1,
                "serviceProviderId.spBusinessImage": 1,
                "serviceProviderId.numberOfRatings": 1,
                "serviceProviderId.serviceProviderRatings": 1,
                "assignedAgentId.firstName": 1,
                "assignedAgentId.lastName": 1,
                "assignedAgentId.avatar": 1,
                "assignedAgentId.numberOfRatings": 1,
                "assignedAgentId.filedAgentRatings": 1,
                createdAt: 1,
            },
        },
        { $match: searchQuery },
        { $skip: skip },
        { $limit: limitNumber },
        { $sort: { createdAt: -1 } },
    ]);
    const totalDocs = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { userId: userId }),
        },
    ]);
    const totalRequest = totalDocs.length;
    return (0, response_1.sendSuccessResponse)(res, 200, {
        results,
        totalRequest: totalRequest,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Service request retrieved successfully.");
}));
//get service request for service provider
exports.getJobByStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { page = "1", limit = "10", query = "" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isUserBanned: false }, (query && {
        $or: [
            { requestProgress: { $regex: query, $options: "i" } },
            { categoryName: { $regex: query, $options: "i" } },
            { customerFirstName: { $regex: query, $options: "i" } },
            { "assignedAgentId.firstName": { $regex: query, $options: "i" } },
        ],
    }));
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "Accepted"
        ? { requestProgress: { $in: ["Pending", "CancelledByFA"] } }
        : requestProgress === "Assigned"
            ? {
                requestProgress: { $in: ["Pending", "CancelledByFA"] },
                assignedAgentId: { $ne: null, $exists: true },
            }
            : requestProgress === "Started"
                ? { requestProgress: "Started" }
                : requestProgress === "All"
                    ? {}
                    : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { serviceProviderId: serviceProviderId }),
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryId",
            },
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
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings",
                        },
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: {
                                $ifNull: [{ $avg: "$userRatings.rating" }, 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "assignedAgentId",
                as: "assignedAgentId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        { $sort: { updatedAt: -1 } },
        {
            $project: {
                _id: 1,
                categoryName: "$categoryId.name",
                requestProgress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                customerFirstName: "$userId.firstName",
                customerLastName: "$userId.lastName",
                "assignedAgentId.firstName": 1,
                "assignedAgentId.lastName": 1,
                "assignedAgentId._id": 1,
                "assignedAgentId.avatar": 1,
                "assignedAgentId.phone": 1,
                customerAvatar: "$userId.avatar",
                isUserBanned: "$userId.isDeleted",
                totalCustomerRatings: "$userId.totalRatings",
                customerAvgRating: "$userId.userAvgRating",
                createdAt: 1,
            },
        },
        {
            $match: searchQuery,
        },
        { $skip: skip },
        { $limit: limitNumber },
    ]);
    const totalRequest = results.length;
    return (0, response_1.sendSuccessResponse)(res, 200, {
        results,
        totalRequest: totalRequest,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Service request retrieved successfully.");
}));
//get service request for field agent
exports.getJobByStatusByAgent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // console.log(req.user?._id);
    const { page = "1", limit = "10", query = "" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isUserBanned: false }, (query && {
        $or: [
            { categoryName: { $regex: query, $options: "i" } },
            { customerFirstName: { $regex: query, $options: "i" } },
            { "assignedAgentId.firstName": { $regex: query, $options: "i" } },
        ],
    }));
    const assignedAgentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "Assigned"
        ? {
            requestProgress: { $in: ["Pending", "CancelledByFA"] },
            assignedAgentId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
        }
        : { requestProgress };
    const results = yield service_model_1.default.aggregate([
        {
            $match: Object.assign(Object.assign({}, progressFilter), { assignedAgentId: assignedAgentId }),
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$categoryId",
            },
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
                            from: "ratings",
                            foreignField: "ratedTo",
                            localField: "_id",
                            as: "userRatings",
                        },
                    },
                    {
                        $addFields: {
                            totalRatings: { $ifNull: [{ $size: "$userRatings" }, 0] },
                            userAvgRating: {
                                $ifNull: [{ $avg: "$userRatings.rating" }, 0],
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "assignedAgentId",
                as: "assignedAgentId",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$userId",
            },
        },
        {
            $project: {
                _id: 1,
                categoryName: "$categoryId.name",
                requestProgress: 1,
                isIncentiveGiven: 1,
                incentiveAmount: 1,
                customerFirstName: "$userId.firstName",
                customerLastName: "$userId.lastName",
                "assignedAgentId.firstName": 1,
                "assignedAgentId.lastName": 1,
                "assignedAgentId._id": 1,
                "assignedAgentId.avatar": 1,
                "assignedAgentId.phone": 1,
                customerAvatar: "$userId.avatar",
                isUserBanned: "$userId.isDeleted",
                totalCustomerRatings: "$userId.totalRatings",
                customerAvgRating: "$userId.userAvgRating",
                createdAt: 1,
            },
        },
        {
            $match: searchQuery,
        },
        { $skip: skip },
        { $limit: limitNumber },
        { $sort: { createdAt: -1 } },
    ]);
    const totalRequest = results.length;
    return (0, response_1.sendSuccessResponse)(res, 200, {
        results,
        totalRequest: totalRequest,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Service request retrieved successfully.");
}));
exports.assignJob = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    let serviceProviderId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const { assignedAgentId, serviceId } = req.body;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    let isAssignable = true;
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({
            userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id,
        }).select("assignJob");
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.fieldAgentManagement)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Permission denied: Assign Job not granted."));
        }
        // const teamInfo = await TeamModel.findOne({ fieldAgentIds: req.user?._id });
        // if (teamInfo) {
        //     serviceProviderId = teamInfo?.serviceProviderId;
        // }
        // const agentUser = await UserModel.findById(assignedAgentId).select('userType');
        // isAssignable = agentUser?.userType === "FieldAgent" || agentUser?.userType === "TeamLead";
    }
    // if (!isAssignable) {
    //     return sendErrorResponse(res, new ApiError(403, "Assigned agent must be a FieldAgent."));
    // };
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, {
        $set: {
            assignedAgentId: new mongoose_1.default.Types.ObjectId(assignedAgentId),
            // serviceProviderId: serviceProviderId
        },
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service not found for assigning."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, updatedService, "Job assigned to the agent successfully.");
}));
exports.totalJobCount = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service provider ID is required."));
    }
    const jobData = yield service_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: serviceProviderId,
            },
        },
        {
            $group: {
                _id: "$requestProgress",
                count: { $sum: 1 },
                jobDetails: { $push: "$$ROOT" },
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, jobData, "Job counts retrieved successfully.");
}));
exports.fetchAssignedserviceProvider = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    const assignedSPDetails = yield service_model_1.default.aggregate([
        {
            $match: {
                _id: new mongoose_1.default.Types.ObjectId(serviceId),
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "serviceProviderId",
                as: "SP_Details",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$SP_Details",
            },
        },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "serviceProviderId",
                as: "SP_Additional_Details",
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$SP_Additional_Details",
            },
        },
        {
            $addFields: {
                spFullName: {
                    $concat: ["$SP_Details.firstName", " ", "$SP_Details.lastName"],
                },
                companyDesc: "$SP_Additional_Details.companyIntroduction",
                backgroundCheck: {
                    $cond: ["$SP_Details.isVerified", true, false],
                },
                licenseVerified: {
                    $cond: ["$SP_Details.isVerified", true, false],
                },
                insuranceVerified: {
                    $cond: ["$SP_Details.isVerified", true, false],
                },
                arrivalFee: {
                    $cond: [
                        "$SP_Additional_Details.isAnyArrivalFee",
                        "$SP_Additional_Details.arrivalFee",
                        0,
                    ],
                },
            },
        },
        {
            $project: {
                spFullName: 1,
                companyDesc: 1,
                backgroundCheck: 1,
                licenseVerified: 1,
                insuranceVerified: 1,
                arrivalFee: 1,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, assignedSPDetails[0], "Assigned service provider retrieved successfully.");
}));
//get service request for customer
exports.getCompletedService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const results = yield service_model_1.default.aggregate([
        {
            $match: {
                requestProgress: "Completed",
                userId: userId,
            },
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
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
                        },
                    },
                    {
                        $addFields: {
                            numberOfRatings: { $size: "$serviceProviderIdRatings" },
                            serviceProviderRatings: {
                                $cond: {
                                    if: { $gt: [{ $size: "$serviceProviderIdRatings" }, 0] },
                                    then: { $avg: "$serviceProviderIdRatings.rating" },
                                    else: 0,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId",
            },
        },
        {
            $project: {
                _id: 1,
                "categoryId.name": 1,
                "categoryId.categoryImage": 1,
                requestProgress: 1,
                "serviceProviderId.numberOfRatings": 1,
                "serviceProviderId.serviceProviderRatings": 1,
                createdAt: 1,
            },
        },
        { $sort: { createdAt: -1 } },
    ]);
    const totalRequest = results.length;
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: totalRequest }, "Service request retrieved successfully.");
}));
//get customer's address history
exports.fetchServiceAddressHistory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const results = yield service_model_1.default.aggregate([
        {
            $match: {
                userId: userId,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: "$serviceAddress",
                createdAt: { $max: "$createdAt" },
                serviceId: { $first: "$_id" },
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $project: {
                _id: 0,
                serviceAddress: "$_id",
                // createdAt: 1,
                serviceId: 1,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: results.length }, "Unique service address history retrieved successfully.");
}));
//fetch incentive details
exports.fetchIncentiveDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const results = yield service_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                requestProgress: "Completed",
                isIncentiveGiven: true,
                serviceProviderId: userId,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, { results, totalRequest: results.length }, "Incentive details retrieved successfully.");
}));
