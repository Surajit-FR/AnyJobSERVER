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
exports.getDashboardCardsDetails = exports.fetchAdminAllTransactions = exports.fetchAdminReceivedFund = exports.getCustomersTransaction = exports.getPaymentMethods = exports.updateUserPreference = exports.addBankDetails = exports.getIpLogs = exports.updateUser = exports.fetchIPlogs = exports.getAgentEngagementStatus = exports.assignTeamLead = exports.fetchAssociates = exports.banUser = exports.verifyServiceProvider = exports.getSingleUser = exports.getUsers = exports.getAdminUsersList = exports.getRegisteredCustomerList = exports.getServiceProviderList = exports.addAdditionalInfo = exports.addAddress = exports.getUser = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const address_model_1 = __importDefault(require("../models/address.model"));
const userAdditionalInfo_model_1 = __importDefault(require("../models/userAdditionalInfo.model"));
const teams_model_1 = __importDefault(require("../models/teams.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const cloudinary_1 = require("../utils/cloudinary");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const multer_middleware_1 = require("../middlewares/multer.middleware");
const IP_model_1 = __importDefault(require("../models/IP.model"));
const bankDetails_model_1 = __importDefault(require("../models/bankDetails.model"));
const paymentMethod_model_1 = __importDefault(require("../models/paymentMethod.model"));
const auth_1 = require("../utils/auth");
const userPreference_model_1 = __importDefault(require("../models/userPreference.model"));
const purchase_model_1 = __importDefault(require("../models/purchase.model"));
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const config_1 = require("../config/config");
const libphonenumber_js_1 = require("libphonenumber-js");
const stripe_1 = __importDefault(require("stripe"));
const adminRevenue_model_1 = __importDefault(require("../models/adminRevenue.model"));
const service_model_1 = __importDefault(require("../models/service.model"));
const cancellationFee_model_1 = __importDefault(require("../models/cancellationFee.model"));
const axios_1 = __importDefault(require("axios"));
const stripe = new stripe_1.default(config_1.STRIPE_SECRET_KEY, {
    apiVersion: "2024-09-30.acacia",
});
function uploadToStripeFromCloudinary(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default.get(imageUrl, { responseType: "arraybuffer" });
        //  Convert it to a Buffer
        const imageBuffer = Buffer.from(response.data);
        console.log({ imageBuffer });
        const stripeFile = yield stripe.files.create({
            purpose: "identity_document",
            file: {
                data: imageBuffer,
                name: "id.jpg",
                type: "image/jpeg",
            },
        });
        // console.log({stripeFile});
        return stripeFile.id;
    });
}
const test = typeof (uploadToStripeFromCloudinary("https://res.cloudinary.com/dhj5yyosd/image/upload/v1760008955/fyv6wvnqaoyz5f85xlyx.png"));
console.log({ test });
// get loggedin user
exports.getUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const userDetails = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: userId,
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress",
            },
        },
        {
            $lookup: {
                from: "services",
                foreignField: "assignedAgentId",
                localField: "_id",
                as: "ServicesRelatedToAgent",
            },
        },
        {
            $lookup: {
                from: "teams",
                foreignField: "fieldAgentIds",
                localField: "_id",
                as: "teamDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "additionalinfos",
                            foreignField: "userId",
                            localField: "serviceProviderId",
                            as: "companyDetails",
                        },
                    },
                    {
                        $unwind: {
                            preserveNullAndEmptyArrays: true,
                            path: "$companyDetails",
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$teamDetails",
            },
        },
        {
            $addFields: {
                CompletedServicesByAgent: {
                    $filter: {
                        input: "$ServicesRelatedToAgent",
                        as: "completedServicesByAgent",
                        cond: {
                            $and: [
                                {
                                    $eq: [
                                        "$$completedServicesByAgent.requestProgress",
                                        "Completed",
                                    ],
                                },
                                {
                                    $eq: ["$$completedServicesByAgent.assignedAgentId", "$_id"],
                                },
                            ],
                        },
                    },
                },
                totalAssignedToAgent: {
                    $filter: {
                        input: "$ServicesRelatedToAgent",
                        as: "assignedServicesToAgent",
                        cond: {
                            $and: [
                                {
                                    $or: [
                                        {
                                            $eq: [
                                                "$$assignedServicesToAgent.requestProgress",
                                                "Pending",
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$$assignedServicesToAgent.requestProgress",
                                                "CancelledByFA",
                                            ],
                                        },
                                    ],
                                },
                                {
                                    $eq: ["$$assignedServicesToAgent.assignedAgentId", "$_id"],
                                },
                            ],
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                totalCompletedServicesByAgent: { $size: "$CompletedServicesByAgent" },
                totalAssignedServicesByAgent: { $size: "$totalAssignedToAgent" },
            },
        },
        {
            $addFields: {
                agentSuccessRate: {
                    $cond: {
                        if: { $eq: ["$totalAssignedServicesByAgent", 0] },
                        then: 0,
                        else: {
                            $multiply: [
                                {
                                    $divide: [
                                        "$totalCompletedServicesByAgent",
                                        "$totalAssignedServicesByAgent",
                                    ],
                                },
                                100,
                            ],
                        },
                    },
                },
                agentAccuracy: 50,
                agentRelatedToCompany: "$teamDetails.companyDetails.companyName",
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
                "userAddress.__v": 0,
                "userAddress.isDeleted": 0,
                ServicesRelatedToAgent: 0,
                CompletedServicesByAgent: 0,
                totalAssignedToAgent: 0,
                teamDetails: 0,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, userDetails[0], "User retrieved successfully.");
}));
// Add address for the user
exports.addAddress = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { zipCode, latitude, longitude, addressType, location } = req.body;
    if (!zipCode || !latitude || !longitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All address fields are required"));
    }
    const existingAddress = yield address_model_1.default.findOne({
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
    });
    if (existingAddress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Address already exists for this user"));
    }
    const geoLocation = {
        type: "Point",
        coordinates: [longitude, latitude], // [longitude, latitude]
    };
    if (!geoLocation)
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Location is required."));
    const updateUser = yield user_model_1.default.findByIdAndUpdate({ _id: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id }, { $set: { geoLocation: geoLocation } }, { new: true });
    const newAddress = new address_model_1.default({
        userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c._id,
        zipCode,
        latitude,
        longitude,
        addressType,
        location,
    });
    const savedAddress = yield newAddress.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAddress, "Address added successfully");
}));
exports.addAdditionalInfo = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName, phone, totalYearExperience, routing_number, account_number, account_holder_name, account_holder_type, } = req.body;
    console.log("addAdditionalInfo payload:", req.body);
    // Check if additional info already exists for the user
    const existingAdditionalInfo = yield userAdditionalInfo_model_1.default.findOne({
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
    });
    if (existingAdditionalInfo) {
        // Delete uploaded files if they exist
        const files = req.files;
        if (files) {
            (0, multer_middleware_1.deleteUploadedFiles)(files);
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Additional info already exists for this user"));
    }
    // Extract files from the request
    const files = req.files;
    if (!files) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
    }
    const companyLicenseImageFile = (_b = files.companyLicenseImage) === null || _b === void 0 ? void 0 : _b[0];
    const licenseProofImageFile = (_c = files.licenseProofImage) === null || _c === void 0 ? void 0 : _c[0];
    const businessLicenseImageFile = (_d = files.businessLicenseImage) === null || _d === void 0 ? void 0 : _d[0];
    const businessImageFile = (_e = files.businessImage) === null || _e === void 0 ? void 0 : _e[0];
    const driverLicenseImages = files.driverLicenseImage || [];
    // Ensure all required files are provided
    if (!companyLicenseImageFile ||
        !licenseProofImageFile ||
        !businessLicenseImageFile ||
        !businessImageFile ||
        driverLicenseImages.length < 2) {
        // Delete uploaded files if they exist
        if (files) {
            (0, multer_middleware_1.deleteUploadedFiles)(files);
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All files are required, including two driver license images"));
    }
    if (!routing_number ||
        !account_number ||
        !account_holder_name ||
        !account_holder_type) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All banking details like routing_number,account_number,account_holder_name,account_holder_type are required"));
    }
    // Upload driver license images to Cloudinary
    const uploadedDriverLicenseImages = [];
    for (const file of driverLicenseImages) {
        const uploadResult = yield (0, cloudinary_1.uploadOnCloudinary)(file.path);
        if (!uploadResult) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Error uploading driver license images"));
        }
        uploadedDriverLicenseImages.push(uploadResult.secure_url);
    }
    // Upload other files to Cloudinary
    const companyLicenseImage = yield (0, cloudinary_1.uploadOnCloudinary)(companyLicenseImageFile.path);
    const licenseProofImage = yield (0, cloudinary_1.uploadOnCloudinary)(licenseProofImageFile.path);
    const businessLicenseImage = yield (0, cloudinary_1.uploadOnCloudinary)(businessLicenseImageFile.path);
    const businessImage = yield (0, cloudinary_1.uploadOnCloudinary)(businessImageFile.path);
    // Ensure all files were uploaded successfully
    if (!companyLicenseImage ||
        !licenseProofImage ||
        !businessLicenseImage ||
        !businessImage) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Error uploading other files"));
    }
    // Update phone number and DOB in user data
    const updateUser = yield user_model_1.default.findByIdAndUpdate({ _id: (_f = req.user) === null || _f === void 0 ? void 0 : _f._id }, { $set: { phone, dob: DOB } }, { new: true });
    // Create new additional info record
    const newAdditionalInfo = new userAdditionalInfo_model_1.default({
        userId: (_g = req.user) === null || _g === void 0 ? void 0 : _g._id,
        companyName,
        companyIntroduction,
        DOB,
        driverLicense,
        EIN,
        socialSecurity,
        companyLicense,
        insurancePolicy,
        businessName,
        totalYearExperience,
        driverLicenseImages: uploadedDriverLicenseImages,
        companyLicenseImage: companyLicenseImage.secure_url,
        licenseProofImage: licenseProofImage.secure_url,
        businessLicenseImage: businessLicenseImage.secure_url,
        businessImage: businessImage.secure_url,
        routing_number,
        account_number,
        account_holder_name,
        account_holder_type,
    });
    // Save the new additional info record
    const savedAdditionalInfo = yield newAdditionalInfo.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAdditionalInfo, "Additional info added successfully");
}));
//get serviceProvider List
exports.getServiceProviderList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const searchQuery = query
        ? {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ],
        }
        : {};
    const matchCriteria = Object.assign({ isDeleted: false, userType: "ServiceProvider" }, searchQuery);
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;
    const results = yield user_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "_id",
                as: "additionalInfo",
            },
        },
        {
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress",
            },
        },
        {
            $lookup: {
                from: "teams",
                localField: "_id",
                foreignField: "serviceProviderId",
                as: "teams",
            },
        },
        {
            $unwind: {
                path: "$teams",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "teams.fieldAgentIds",
                foreignField: "_id",
                as: "fieldAgents",
            },
        },
        {
            $addFields: {
                fieldAgentCount: { $size: "$fieldAgents" },
            },
        },
        {
            $project: {
                teams: 0,
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                "additionalInfo.__v": 0,
                "additionalInfo.isDeleted": 0,
                "userAddress.__v": 0,
                "userAddress.isDeleted": 0,
                "fieldAgents.password": 0,
                "fieldAgents.refreshToken": 0,
                "fieldAgents.isDeleted": 0,
                "fieldAgents.__v": 0,
                rawPassword: 0,
            },
        },
        { $sort: sortCriteria },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber },
    ]);
    const totalRecords = yield user_model_1.default.countDocuments(matchCriteria);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceProviders: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber,
        },
    }, "ServiceProvider list retrieved successfully.");
}));
//get registered customer list
exports.getRegisteredCustomerList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc", } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    console.log("sortBy==");
    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    };
    const matchCriteria = Object.assign({ userType: "Customer" }, searchFilter);
    // Fetch the total number of customers before pagination
    const totalCustomers = yield user_model_1.default.countDocuments(matchCriteria);
    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / pageSize);
    // Fetch the filtered and paginated results
    const customers = yield user_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $lookup: {
                from: "ratings",
                foreignField: "ratedTo",
                localField: "_id",
                as: "userRating",
            },
        },
        {
            $addFields: {
                customerAvgRating: { $round: [{ $avg: "$userRating.rating" }, 2] },
            },
        },
        {
            $project: {
                __v: 0,
                refreshToken: 0,
                password: 0,
                rawPassword: 0,
                userRating: 0,
            },
        },
        { $sort: { [sortField]: sortDirection } },
        { $skip: (pageNumber - 1) * pageSize },
        { $limit: pageSize },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        customers,
        pagination: {
            total: totalCustomers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize,
        },
    }, "Registered Customers list retrieved successfully.");
}));
//get admin user list
exports.getAdminUsersList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc", } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sortField = typeof sortBy === "string" ? sortBy : "createdAt";
    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    };
    const matchCriteria = Object.assign({ userType: { $in: ["Admin", "Finance"] } }, searchFilter);
    const totalAdminUsers = yield user_model_1.default.countDocuments(matchCriteria);
    const totalPages = Math.ceil(totalAdminUsers / pageSize);
    const adminUsers = yield user_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $project: {
                __v: 0,
                refreshToken: 0,
                password: 0,
                rawPassword: 0,
            },
        },
        { $sort: { [sortField]: sortDirection } },
        { $skip: (pageNumber - 1) * pageSize },
        { $limit: pageSize },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        adminUsers,
        pagination: {
            total: totalAdminUsers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize,
        },
    }, "Admin Users list retrieved successfully.");
}));
//get all users list
exports.getUsers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress",
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
                "userAddress.__v": 0,
                "userAddress.isDeleted": 0,
                rawPassword: 0,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Users retrieved successfully.");
}));
//get single user
exports.getSingleUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid User ID."));
    }
    const userDetails = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose_1.default.Types.ObjectId(userId),
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress",
            },
        },
        {
            $lookup: {
                from: "teams",
                foreignField: "serviceProviderId",
                localField: "_id",
                as: "teamDetails",
            },
        },
        {
            $lookup: {
                from: "services",
                foreignField: "serviceProviderId",
                localField: "_id",
                as: "Services",
                pipeline: [
                    {
                        // requestProgress:{$or:["Completed","Pending"]}
                        $match: {
                            $or: [
                                { requestProgress: "Completed" },
                                { requestProgress: "Pending" },
                            ],
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "services",
                foreignField: "assignedAgentId",
                localField: "_id",
                as: "ServicesRelatedToAgent",
                // pipeline: [
                //     {
                //         // requestProgress:{$or:["Completed","Pending"]}
                //         $match: {
                //             $or: [
                //                 { requestProgress: "Completed" },
                //                 { requestProgress: "Pending" }
                //             ]
                //         }
                //     }
                // ]
            },
        },
        {
            $addFields: {
                totalFieldAgent: {
                    $reduce: {
                        input: "$teamDetails",
                        initialValue: 0,
                        in: { $add: ["$$value", { $size: "$$this.fieldAgentIds" }] },
                    },
                },
                CompletedServices: {
                    $filter: {
                        input: "$Services",
                        as: "completedServices",
                        cond: {
                            $eq: ["$$completedServices.requestProgress", "Completed"],
                        },
                    },
                },
                CompletedServicesByAgent: {
                    $filter: {
                        input: "$ServicesRelatedToAgent",
                        as: "completedServicesByAgent",
                        cond: {
                            $and: [
                                {
                                    $eq: [
                                        "$$completedServicesByAgent.requestProgress",
                                        "Completed",
                                    ],
                                },
                                {
                                    $eq: ["$$completedServicesByAgent.assignedAgentId", "$_id"],
                                },
                            ],
                        },
                    },
                },
                totalAssignedToAgent: {
                    $filter: {
                        input: "$ServicesRelatedToAgent",
                        as: "assignedServicesToAgent",
                        cond: {
                            $and: [
                                {
                                    $or: [
                                        {
                                            $eq: [
                                                "$$assignedServicesToAgent.requestProgress",
                                                "Pending",
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$$assignedServicesToAgent.requestProgress",
                                                "CancelledByFA",
                                            ],
                                        },
                                    ],
                                },
                                {
                                    $eq: ["$$assignedServicesToAgent.assignedAgentId", "$_id"],
                                },
                            ],
                        },
                    },
                },
                newServices: {
                    $filter: {
                        input: "$Services",
                        as: "completedServices",
                        cond: { $eq: ["$$completedServices.requestProgress", "Pending"] },
                    },
                },
            },
        },
        {
            $addFields: {
                totalCompletedServices: { $size: "$CompletedServices" },
                totalNewServices: { $size: "$newServices" },
                totalCompletedServicesByAgent: { $size: "$CompletedServicesByAgent" },
                totalAssignedServicesByAgent: { $size: "$totalAssignedToAgent" },
            },
        },
        {
            $addFields: {
                successRate: {
                    $cond: {
                        if: { $eq: ["$totalAssignedServicesByAgent", 0] },
                        then: 0,
                        else: {
                            $multiply: [
                                {
                                    $divide: [
                                        "$totalCompletedServicesByAgent",
                                        "$totalAssignedServicesByAgent",
                                    ],
                                },
                                100,
                            ],
                        },
                    },
                },
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
                "userAddress.__v": 0,
                "userAddress.isDeleted": 0,
                teamDetails: 0,
                CompletedServices: 0,
                Services: 0,
                newServices: 0,
                rawPassword: 0,
                ServicesRelatedToAgent: 0,
                CompletedServicesByAgent: 0,
                totalAssignedToAgent: 0,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, userDetails[0], "User retrieved successfully.");
}));
// verifyServiceProvider controller
exports.verifyServiceProvider = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceProviderId } = req.params;
    const { isVerified } = req.body;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider ID is required."));
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(serviceProviderId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid Service Provider ID."));
    }
    const results = yield user_model_1.default.findByIdAndUpdate(serviceProviderId, { $set: { isVerified } }, { new: true }).select("-password -refreshToken -__V");
    if (!results) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider not found."));
    }
    const additionalInfo = yield userAdditionalInfo_model_1.default.findOne({
        userId: serviceProviderId,
    });
    if (isVerified && results.userType === "ServiceProvider") {
        const userWallet = yield wallet_model_1.default.findOne({ userId: results === null || results === void 0 ? void 0 : results._id });
        if (userWallet === null || userWallet === void 0 ? void 0 : userWallet.stripeConnectedAccountId) {
            return res.status(200).json({
                message: "Account already exists",
            });
        }
        const dob = results === null || results === void 0 ? void 0 : results.dob;
        if (!dob || !(dob instanceof Date)) {
            return res.status(400).json({ error: "Invalid date of birth" });
        }
        const phoneNumber = (0, libphonenumber_js_1.parsePhoneNumberFromString)((results === null || results === void 0 ? void 0 : results.phone) || "");
        const localPhone = phoneNumber ? phoneNumber.nationalNumber : "";
        console.log({ localPhone });
        const accountParams = {
            type: "custom",
            country: "US",
            email: results === null || results === void 0 ? void 0 : results.email,
            business_type: "individual",
            capabilities: {
                transfers: { requested: true },
            },
            individual: {
                first_name: results === null || results === void 0 ? void 0 : results.firstName,
                last_name: results === null || results === void 0 ? void 0 : results.lastName,
                email: results === null || results === void 0 ? void 0 : results.email,
                phone: localPhone,
                ssn_last_4: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.socialSecurity,
                dob: {
                    day: dob.getDate(),
                    month: dob.getMonth() + 1,
                    year: dob.getFullYear(),
                },
                verification: {
                    document: {
                        front: yield uploadToStripeFromCloudinary(additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.driverLicenseImages[0]),
                        back: yield uploadToStripeFromCloudinary(additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.driverLicenseImages[1]),
                    },
                },
            },
            business_profile: {
                url: "https://your-test-business.com",
                mcc: "5818",
            },
            // external_account: 'btok_us_verified',
            external_account: {
                object: "bank_account",
                country: "US",
                currency: "usd",
                routing_number: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.routing_number,
                account_number: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.account_number,
                account_holder_name: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.account_holder_name,
                account_holder_type: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.account_holder_type,
            },
            tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: req.ip || "127.0.0.1",
            },
        };
        const account = yield stripe.accounts.create(accountParams);
        yield stripe.accounts.update(account.id, {
            settings: {
                payouts: {
                    schedule: {
                        interval: "manual",
                    },
                },
            },
        });
        yield new wallet_model_1.default({
            userId: results === null || results === void 0 ? void 0 : results._id,
            stripeConnectedAccountId: account.id,
            balance: 0,
        }).save();
        console.log("Stripe account created successfully:", account.id);
    }
    const message = isVerified
        ? "Service Provider profile verified successfully."
        : "Service Provider profile made unverified.";
    return (0, response_1.sendSuccessResponse)(res, 200, {}, message);
}));
// banUser controller
exports.banUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { isDeleted } = req.body;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid User ID."));
    }
    const results = yield user_model_1.default.findByIdAndUpdate(userId, { $set: { isDeleted } }, { new: true }).select("-password -refreshToken -__V");
    if (!results) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User not found."));
    }
    const message = isDeleted
        ? "User profile made banned."
        : "User profile made unbanned.";
    return (0, response_1.sendSuccessResponse)(res, 200, {}, message);
}));
exports.fetchAssociates = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service provider ID is required."));
    }
    const results = yield teams_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: serviceProviderId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "serviceProviderId",
                foreignField: "_id",
                as: "serviceProviderId",
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
                localField: "fieldAgentIds",
                foreignField: "_id",
                as: "teamMembers",
                pipeline: [
                    {
                        $lookup: {
                            from: "permissions",
                            localField: "_id",
                            foreignField: "userId",
                            as: "agentPermission",
                        },
                    },
                ],
            },
        },
        {
            $project: {
                _id: 1,
                serviceProviderName: {
                    $concat: [
                        "$serviceProviderId.firstName",
                        " ",
                        "$serviceProviderId.lastName",
                    ],
                },
                teamMembers: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    userType: 1,
                    agentPermission: {
                        _id: 1,
                        acceptRequest: 1,
                        assignJob: 1,
                        fieldAgentManagement: 1,
                    },
                },
            },
        },
    ]);
    if (!results || results.length === 0) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Field agents not found."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Field Agent list retrieved successfully.");
}));
exports.assignTeamLead = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { fieldAgentId } = req.body;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const team = yield teams_model_1.default.findOne({
            serviceProviderId,
            fieldAgentIds: { $in: fieldAgentId },
        });
        if (!team) {
            return res.status(400).json({
                message: "Field agent not found in the service provider's team.",
            });
        }
        const fieldAgent = yield user_model_1.default.findById(fieldAgentId);
        if ((fieldAgent === null || fieldAgent === void 0 ? void 0 : fieldAgent.userType) === "TeamLead") {
            return (0, response_1.sendSuccessResponse)(res, 200, "This agent is already a teamlead.");
            return res
                .status(400)
                .json({ message: "This agent is already a teamlead." });
        }
        const updatedFieldAgent = yield user_model_1.default.findByIdAndUpdate(fieldAgentId, { userType: "TeamLead" }, { new: true });
        if (!updatedFieldAgent) {
            return res
                .status(500)
                .json({ message: "Failed to update user role to teamlead." });
        }
        return (0, response_1.sendSuccessResponse)(res, 200, updatedFieldAgent, "Field agent promoted to team lead successfully.");
    }
    catch (error) {
        console.error("Error promoting field agent to team lead:", error);
        res
            .status(500)
            .json({ message: "An error occurred while assigning team lead." });
    }
}));
exports.getAgentEngagementStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service provider ID is required."));
    }
    const results = yield teams_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: serviceProviderId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "serviceProviderId",
                foreignField: "_id",
                as: "serviceProviderId",
            },
        },
        {
            $unwind: {
                path: "$serviceProviderId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "fieldAgentIds",
                foreignField: "_id",
                as: "teamMembers",
                pipeline: [
                    {
                        $match: {
                            isDeleted: false,
                        },
                    },
                    {
                        $lookup: {
                            from: "services",
                            localField: "_id",
                            foreignField: "assignedAgentId",
                            as: "engagement",
                        },
                    },
                    {
                        $addFields: {
                            isEngaged: {
                                $cond: {
                                    if: {
                                        $gt: [{ $size: "$engagement" }, 0],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                serviceProviderName: {
                    $concat: [
                        "$serviceProviderId.firstName",
                        " ",
                        "$serviceProviderId.lastName",
                    ],
                },
            },
        },
        {
            $project: {
                _id: 1,
                serviceProviderName: 1,
                "teamMembers._id": 1,
                "teamMembers.firstName": 1,
                "teamMembers.lastName": 1,
                "teamMembers.email": 1,
                "teamMembers.phone": 1,
                "teamMembers.userType": 1,
                "teamMembers.avatar": 1,
                "teamMembers.isEngaged": 1,
            },
        },
    ]);
    if (!results || results.length === 0) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Field agents not found."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Field Agent list with engagement status retrieved successfully.");
}));
// fetch IPlogs for admin
exports.fetchIPlogs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
    }
    const iplogs = yield IP_model_1.default.find({ userId: userId }).populate({
        path: "userId",
        select: "firstName lastName email phone",
    });
    return (0, response_1.sendSuccessResponse)(res, 200, iplogs, "IPlogs retrieved successfully.");
}));
exports.updateUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    const { firstName, lastName } = req.body;
    const userAvtarFile = req.files;
    const userImgFile = (userAvtarFile === null || userAvtarFile === void 0 ? void 0 : userAvtarFile.userImage)
        ? userAvtarFile.userImage[0]
        : undefined;
    let userImgUrl;
    if (userImgFile) {
        const userImg = yield (0, cloudinary_1.uploadOnCloudinary)(userImgFile.path);
        userImgUrl = userImg === null || userImg === void 0 ? void 0 : userImg.secure_url;
    }
    const updatedUser = yield user_model_1.default.findByIdAndUpdate({ _id: userId }, {
        $set: Object.assign({ firstName: firstName, lastName: lastName }, (userImgUrl && { avatar: userImgUrl })),
    }, { new: true }).select("-rawPassword");
    if (!updatedUser) {
        return (0, response_1.sendSuccessResponse)(res, 200, updatedUser, "User not found for updating.");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, updatedUser, "User updated Successfully");
}));
exports.getIpLogs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { page = 1, limit = 10, query = "", sortBy = "timestamp", sortType = "desc", } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const searchQuery = query
        ? {
            $or: [
                { method: { $regex: query, $options: "i" } },
                { route: { $regex: query, $options: "i" } },
                { hostname: { $regex: query, $options: "i" } },
                { ipAddress: { $regex: query, $options: "i" } },
            ],
        }
        : {};
    const matchCriteria = Object.assign({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, searchQuery);
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;
    const results = yield IP_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
            },
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                "userId.__v": 0,
                "userId.isDeleted": 0,
                "userId.password": 0,
                "userId.refreshToken": 0,
                "userId.rawPassword": 0,
                "userId.isVerified": 0,
                "userId.createdAt": 0,
                "userId.updatedAt": 0,
                "userId.fcmToken": 0,
            },
        },
        { $sort: sortCriteria },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber },
    ]);
    const totalRecords = yield IP_model_1.default.countDocuments(matchCriteria);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        ipLogs: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber,
        },
    }, "IPLogs retrieved successfully.");
}));
// Add address for the user
exports.addBankDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { bankName, accountHolderName, branchCode, accountNumber, cardNumber, cardHolderName, } = req.body;
    const existingAddress = yield bankDetails_model_1.default.findOne({
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
    });
    if (existingAddress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Bank Details already exists for this user"));
    }
    var cardType = (0, auth_1.getCardType)(cardNumber ? cardNumber : "visa");
    const userAddress = new bankDetails_model_1.default({
        userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
        bankName,
        accountHolderName,
        branchCode,
        accountNumber,
        cardNumber,
        cardHolderName,
        cardType,
    });
    const savedBankDetails = yield userAddress.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedBankDetails, "Bank Details added successfully");
}));
exports.updateUserPreference = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    const { notificationPreference } = req.body;
    const updatedUserPreference = yield userPreference_model_1.default.findOneAndUpdate({ userId: userId }, {
        $set: {
            notificationPreference,
            updatedAt: new Date(),
        },
    }, { new: true }).select("-__v -isDeleted");
    if (!updatedUserPreference) {
        return (0, response_1.sendSuccessResponse)(res, 200, updatedUserPreference, "User not found for updating.");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, updatedUserPreference, "User preference updated successfully");
}));
// GET /api/payment-methods
const getPaymentMethods = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const paymentMethodDetails = yield paymentMethod_model_1.default.find({ userId });
        if (!paymentMethodDetails) {
            return res.status(404).json({ message: "Payment Method not found" });
        }
        return (0, response_1.sendSuccessResponse)(res, 200, paymentMethodDetails, "Payment Method found successfully");
    }
    catch (error) {
        console.error("Error fetching payment methods:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getPaymentMethods = getPaymentMethods;
// export const getCustomersTransaction = async (
//   req: CustomRequest,
//   res: Response
// ) => {
//   try {
//     const userId = req.user?._id;
//     const transactionsDetails = await PurchaseModel.aggregate([
//       {
//         $match: {
//           userId: userId,
//         },
//       },
//       {
//         $lookup: {
//           from: "cancellationfees",
//           foreignField: "userId",
//           localField: "userId",
//           as: "cancellationDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           foreignField: "_id",
//           localField: "userId",
//           as: "userDetails",
//         },
//       },
//       {
//         $unwind: {
//           preserveNullAndEmptyArrays: true,
//           path: "$userDetails",
//         },
//       },
//       {
//         $addFields: {
//           userName: {
//             $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
//           },
//           userImage: "$userDetails.avatar",
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           userId: 1,
//           userName: 1,
//           userImage: 1,
//           cancellationDetails: 1,
//           serviceId: 1,
//           paymentMethodDetails: 1,
//           paymentIntentId: 1,
//           currency: 1,
//           amount: 1,
//           status: 1,
//           createdAt: 1,
//           updatedAt: 1,
//         },
//       },
//     ]);
//     if (!transactionsDetails) {
//       return res.status(404).json({ message: "No transaction was found" });
//     }
//     return sendSuccessResponse(
//       res,
//       200,
//       transactionsDetails,
//       "Transaction history fetched successfully"
//     );
//   } catch (error) {
//     console.error("Error fetching payment methods:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
const getCustomersTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const [purchases, cancellations] = yield Promise.all([
            purchase_model_1.default.aggregate([
                { $match: { userId } },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userDetails",
                    },
                },
                {
                    $unwind: {
                        path: "$userDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $addFields: {
                        userName: {
                            $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                        },
                        userImage: "$userDetails.avatar",
                        type: { $literal: "incentiveFee" },
                    },
                },
                {
                    $project: {
                        userDetails: 0,
                    },
                },
            ]),
            cancellationFee_model_1.default.aggregate([
                { $match: { userId } },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userDetails",
                    },
                },
                {
                    $unwind: {
                        path: "$userDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $addFields: {
                        userName: {
                            $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                        },
                        userImage: "$userDetails.avatar",
                        type: { $literal: "cancellationFee" },
                    },
                },
                {
                    $project: {
                        userDetails: 0,
                    },
                },
            ]),
        ]);
        const transactions = [...purchases, ...cancellations];
        return (0, response_1.sendSuccessResponse)(res, 200, transactions, "Transaction history fetched successfully");
    }
    catch (error) {
        console.error("Error fetching customer transactions:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getCustomersTransaction = getCustomersTransaction;
const fetchAdminReceivedFund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const incentiveDetails = yield purchase_model_1.default.aggregate([
            {
                $match: {
                    status: "succeeded",
                },
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "userId",
                    as: "userDetails",
                },
            },
            {
                $unwind: {
                    preserveNullAndEmptyArrays: true,
                    path: "$userDetails",
                },
            },
            {
                $addFields: {
                    userName: {
                        $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                    },
                    userImage: "$userDetails.avatar",
                },
            },
            {
                $project: {
                    _id: 1,
                    userId: 1,
                    userName: 1,
                    userImage: 1,
                    serviceId: 1,
                    paymentMethodDetails: 1,
                    paymentIntentId: 1,
                    currency: 1,
                    amount: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        const cancellationFeeDetails = yield purchase_model_1.default.aggregate([
            {
                $match: {
                    status: "succeeded",
                },
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "userId",
                    as: "userDetails",
                },
            },
            {
                $unwind: {
                    preserveNullAndEmptyArrays: true,
                    path: "$userDetails",
                },
            },
            {
                $addFields: {
                    userName: {
                        $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"],
                    },
                    userImage: "$userDetails.avatar",
                },
            },
            {
                $project: {
                    _id: 1,
                    userId: 1,
                    userName: 1,
                    userImage: 1,
                    serviceId: 1,
                    paymentMethodDetails: 1,
                    paymentIntentId: 1,
                    currency: 1,
                    amount: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return (0, response_1.sendSuccessResponse)(res, 200, {
            incentiveDetails,
            cancellationFeeDetails,
        }, "Transactions to admin fetched successfully");
    }
    catch (error) {
        console.error("Error fetching payment methods:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.fetchAdminReceivedFund = fetchAdminReceivedFund;
exports.fetchAdminAllTransactions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "10", query = "" } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = Object.assign({ type: "credit" }, (query && {
        $or: [
            { stripeTransactionId: { $regex: query, $options: "i" } },
            { customerName: { $regex: query, $options: "i" } },
            { categoryName: { $regex: query, $options: "i" } },
        ],
    }));
    const transactionsData = yield adminRevenue_model_1.default.aggregate([
        {
            $match: {
                type: "credit",
            },
        },
        {
            $lookup: {
                from: "services",
                foreignField: "_id",
                localField: "serviceId",
                as: "serviceId",
                pipeline: [
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
                            path: "$categoryId",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "serviceProviderId",
                            as: "serviceProviderId",
                        },
                    },
                    {
                        $unwind: {
                            path: "$serviceProviderId",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$serviceId",
                preserveNullAndEmptyArrays: true,
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
                            from: "additionalinfos",
                            foreignField: "userId",
                            localField: "_id",
                            as: "spCompanyDetails",
                        },
                    },
                    {
                        $unwind: {
                            preserveNullAndEmptyArrays: true,
                            path: "$spCompanyDetails",
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$userId",
            },
        },
        {
            $addFields: {
                spCompanyName: {
                    $ifNull: ["$userId.spCompanyDetails.companyName", null],
                },
            },
        },
        {
            $addFields: {
                serviceProviderName: {
                    $concat: [
                        "$serviceId.serviceProviderId.firstName",
                        " ",
                        "$serviceId.serviceProviderId.lastName",
                    ],
                },
                customerName: {
                    $concat: ["$userId.firstName", " ", "$userId.lastName"],
                },
                categoryName: "$serviceId.categoryId.name",
                categoryCost: "$serviceId.categoryId.serviceCost",
                // serviceBookingDate: "$serviceId.serviceProviderId.createdAt",
            },
        },
        { $sort: { createdAt: -1 } },
        { $match: searchQuery },
        { $skip: skip },
        { $limit: limitNumber },
        {
            $project: {
                _id: 1,
                // userId:1,
                type: 1,
                currency: 1,
                amount: 1,
                description: 1,
                stripeTransactionId: 1,
                createdAt: 1,
                updatedAt: 1,
                serviceProviderName: 1,
                customerName: 1,
                categoryName: 1,
                categoryCost: 1,
                spCompanyName: 1,
            },
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        transactionsData,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
        },
    }, "Admin's all transactions fetched successfully");
}));
exports.getDashboardCardsDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalCustomer = yield user_model_1.default.find({
        userType: "Customer",
        isDeleted: false,
    }).countDocuments();
    const totalServiceProvider = yield user_model_1.default.find({
        userType: "ServiceProvider",
        isVerified: true,
        isDeleted: false,
    }).countDocuments();
    const totalGeneratedService = yield service_model_1.default.find({}).countDocuments();
    const balance = yield stripe.balance.retrieve();
    const avilable = balance.available[0].amount;
    const pending = balance.pending[0].amount;
    return (0, response_1.sendSuccessResponse)(res, 200, {
        totalCustomer,
        totalServiceProvider,
        totalGeneratedService,
        balance: {
            avilable,
            pending,
        },
    }, "Dashboard card details fetched successfully");
}));
