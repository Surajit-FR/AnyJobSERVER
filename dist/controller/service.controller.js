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
exports.totalJobCount = exports.assignJob = exports.getServiceRequestByStatus = exports.fetchAssociatedCustomer = exports.fetchSingleServiceRequest = exports.fetchNearByServiceProvider = exports.fetchServiceRequest = exports.deleteService = exports.handleServiceRequestState = exports.updateServiceRequest = exports.getAcceptedServiceRequestInJobQueue = exports.getServiceRequestList = exports.addService = void 0;
const service_model_1 = __importDefault(require("../models/service.model"));
const address_model_1 = __importDefault(require("../models/address.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const permission_model_1 = __importDefault(require("../models/permission.model"));
const teams_model_1 = __importDefault(require("../models/teams.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
// addService controller
exports.addService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { categoryId, serviceStartDate, serviceShifftId, SelectedShiftTime, serviceZipCode, serviceLatitude, serviceLongitude, isIncentiveGiven, incentiveAmount, isTipGiven, tipAmount, otherInfo, answerArray // Expecting answerArray instead of answers
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
    if (!serviceLatitude || !serviceLongitude)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service location is required."));
    if (!answerArray || !Array.isArray(answerArray))
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Answer array is required and must be an array."));
    //strcture location object for geospatial query
    const location = {
        type: "Point",
        coordinates: [serviceLongitude, serviceLatitude] // [longitude, latitude]
    };
    if (!location)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Location is required."));
    // Conditional checks for incentive and tip amounts
    if (isIncentiveGiven && (incentiveAmount === undefined || incentiveAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Incentive amount must be provided and more than zero if incentive is given."));
    }
    if (isTipGiven && (tipAmount === undefined || tipAmount <= 0)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Tip amount must be provided and more than zero if tip is given."));
    }
    // Prepare the new service object
    const newService = yield service_model_1.default.create({
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
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
    });
    if (!newService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while creating the Service Request."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, newService, "Service Request added Successfully");
}));
// getServiceRequestList controller
exports.getServiceRequestList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "10", query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ isDeleted: false }, (query && {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { requestProgress: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
    }));
    // Explicitly cast sortBy and sortType to string
    const validSortBy = sortBy || 'createdAt';
    const validSortType = sortType.toLowerCase() === 'desc' ? -1 : 1;
    const sortCriteria = {};
    sortCriteria[validSortBy] = validSortType;
    const results = yield service_model_1.default.find(searchQuery)
        .populate({
        path: 'userId',
        select: 'firstName lastName email phone'
    })
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNumber)
        .select('-isDeleted -createdAt -updatedAt -__v');
    const totalRecords = yield service_model_1.default.countDocuments(searchQuery);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceRequests: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "All Service requests retrieved successfully.");
}));
// getPendingServiceRequest controller
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
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Service retrieved successfully.");
}));
// updateService controller
exports.updateServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    const { isApproved } = req.body;
    // console.log(req.params);
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    ;
    const updatedService = yield service_model_1.default.findByIdAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId) }, {
        $set: {
            isApproved,
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found for updating."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedService, "Service Request updated Successfully");
}));
// handleServiceRequestState controller
exports.handleServiceRequestState = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    let userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    const { serviceId } = req.params;
    const { isReqAcceptedByServiceProvider, requestProgress } = req.body;
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    const serviceRequest = yield service_model_1.default.findById(serviceId);
    if (!serviceRequest) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found."));
    }
    let serviceProviderId = userId;
    //|| userType === "FieldAgent"
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId }).select('acceptRequest');
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.acceptRequest)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, 'Permission denied: Accept Request not granted.'));
        }
        const team = yield teams_model_1.default.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, 'Service Provider ID not found for team.'));
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
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, 'Service Provider ID not found for team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }
    const updateData = { isReqAcceptedByServiceProvider };
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
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, { $set: updateData }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found for updating."));
    }
    // Calculate total duration if completedAt is available
    let totalExecutionTime = 0;
    if (updatedService.completedAt && updatedService.startedAt) {
        totalExecutionTime = (new Date(updatedService.completedAt).getTime() - new Date(updatedService.startedAt).getTime()) / 1000;
    }
    return (0, response_1.sendSuccessResponse)(res, 200, { updatedService, totalExecutionTime }, isReqAcceptedByServiceProvider ? "Service Request accepted successfully." : "Service Request status updated successfully.");
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
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service  not found for deleting."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Service deleted successfully");
}));
// fetch nearby ServiceRequest controller
exports.fetchServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const userType = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userType;
    let serviceProviderId, address;
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId }).select('acceptRequest');
        if (!permissions || !permissions.acceptRequest) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, 'Permission denied: Accept Request not granted.'));
        }
        ;
        const team = yield teams_model_1.default.aggregate([
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
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, 'Service Provider ID not found in team.'));
            }
            ;
            address = yield address_model_1.default.findOne({ userId: serviceProviderId });
        }
        else {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, 'Team not found.'));
        }
        ;
    }
    else {
        address = yield address_model_1.default.findOne({ userId });
    }
    ;
    if (!address || !address.zipCode || !address.longitude || !address.latitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, `User's Location not found`));
    }
    ;
    const userZipcode = address.zipCode;
    const userLongitude = address.longitude;
    const userLatitude = address.latitude;
    const radius = 4000; // in meter
    // const minZipcode = userZipcode - 10;
    // const maxZipcode = userZipcode + 10;
    const serviceRequests = yield service_model_1.default.find({
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [userLongitude, userLatitude] },
                $maxDistance: radius // Maximum distance in meters
            }
        },
        isReqAcceptedByServiceProvider: false,
        // serviceZipCode: { $gte: minZipcode, $lte: maxZipcode },
        isDeleted: false
    }).populate({
        path: "userId",
        select: "firstName lastName email phone avatar"
    }).populate({
        path: "categoryId",
        select: "name categoryImage"
    });
    return (0, response_1.sendSuccessResponse)(res, 200, serviceRequests, 'Service requests fetched successfully');
}));
//fetch nearby service provider and assign request
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
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, 'No nearby service providers found.'));
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
//
exports.getServiceRequestByStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("api runs");
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { requestProgress } = req.body;
    const progressFilter = requestProgress === "InProgress"
        ? { requestProgress: { $in: ["NotStarted", "Pending", "Started"] } }
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
        const teamInfo = yield teams_model_1.default.findOne({ fieldAgentIds: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id });
        if (teamInfo) {
            serviceProviderId = teamInfo === null || teamInfo === void 0 ? void 0 : teamInfo.serviceProviderId;
        }
        const agentUser = yield user_model_1.default.findById(assignedAgentId).select('userType');
        isAssignable = (agentUser === null || agentUser === void 0 ? void 0 : agentUser.userType) === "FieldAgent" || (agentUser === null || agentUser === void 0 ? void 0 : agentUser.userType) === "TeamLead";
    }
    ;
    if (!isAssignable) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Assigned agent must be a FieldAgent."));
    }
    ;
    const updatedService = yield service_model_1.default.findByIdAndUpdate(serviceId, {
        $set: {
            assignedAgentId: new mongoose_1.default.Types.ObjectId(assignedAgentId),
            serviceProviderId: serviceProviderId
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found for updating."));
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
