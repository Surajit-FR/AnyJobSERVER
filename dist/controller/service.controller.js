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
exports.fetchServiceRequest = exports.deleteService = exports.updateServiceRequest = exports.getPendingServiceRequest = exports.addService = void 0;
const service_model_1 = __importDefault(require("../models/service.model"));
const address_model_1 = __importDefault(require("../models/address.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
exports.addService = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { categoryId, subCategoryId, serviceStartDate, serviceShifftId, SelectedShiftTime, serviceZipCode, serviceLatitude, serviceLongitude, isIncentiveGiven, incentiveAmount, userId, answerArray // Expecting answerArray instead of answers
     } = req.body;
    // Prepare the new service object
    const newService = yield service_model_1.default.create({
        categoryId,
        subCategoryId,
        serviceStartDate,
        serviceShifftId,
        SelectedShiftTime,
        serviceZipCode,
        serviceLatitude,
        serviceLongitude,
        isIncentiveGiven,
        incentiveAmount,
        answerArray,
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
    });
    if (!newService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while creating the Service Request."));
    }
    ;
    // console.log("----");        
    // await sendOTP(req.user?._id )    
    return (0, response_1.sendSuccessResponse)(res, 201, newService, "Service Request added Successfully");
}));
//fetch service request before any service provider accept the request.
exports.getPendingServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield service_model_1.default.aggregate([
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
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Service retrieved successfully.");
}));
// updateService controller
exports.updateServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceId } = req.params;
    const { isApproved, isReqAcceptedByServiceProvider } = req.body;
    console.log(req.params);
    if (!serviceId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service ID is required."));
    }
    ;
    const updatedService = yield service_model_1.default.findByIdAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId) }, {
        $set: {
            isApproved,
            isReqAcceptedByServiceProvider
        }
    }, { new: true });
    if (!updatedService) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Service not found for updating."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedService, "Service Request updated Successfully");
}));
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
// Fetch Service Requests within zipcode range
exports.fetchServiceRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    console.log(userId);
    const user = yield address_model_1.default.findOne({ userId }).select('zipCode');
    if (!user || !user.zipCode) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'User zipcode not found'));
    }
    // console.log("====");
    const userZipcode = user.zipCode;
    const minZipcode = userZipcode - 10;
    const maxZipcode = userZipcode + 10;
    const serviceRequests = yield service_model_1.default.find({
        serviceZipCode: {
            $gte: minZipcode,
            $lte: maxZipcode
        },
        isDeleted: false
    });
    return (0, response_1.sendSuccessResponse)(res, 200, serviceRequests, 'Service requests fetched successfully');
}));
