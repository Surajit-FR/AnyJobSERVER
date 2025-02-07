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
exports.updateUserPreference = exports.addBankDetails = exports.getIpLogs = exports.updateUser = exports.fetchIPlogs = exports.getAgentEngagementStatus = exports.assignTeamLead = exports.fetchAssociates = exports.banUser = exports.verifyServiceProvider = exports.getSingleUser = exports.getUsers = exports.getAdminUsersList = exports.getRegisteredCustomerList = exports.getServiceProviderList = exports.addAdditionalInfo = exports.addAddress = exports.getUser = void 0;
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
const auth_1 = require("../utils/auth");
const userPreference_model_1 = __importDefault(require("../models/userPreference.model"));
// get loggedin user
exports.getUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const userDetails = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: userId
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress"
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
                'userAddress.__v': 0,
                'userAddress.isDeleted': 0,
                // rawPassword: 0
            }
        }
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
    const existingAddress = yield address_model_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
    if (existingAddress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Address already exists for this user"));
    }
    const geoLocation = {
        type: "Point",
        coordinates: [longitude, latitude] // [longitude, latitude]
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
        location
    });
    const savedAddress = yield newAddress.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAddress, "Address added successfully");
}));
exports.addAdditionalInfo = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName, phone, totalYearExperience } = req.body;
    // Check if additional info already exists for the user
    const existingAdditionalInfo = yield userAdditionalInfo_model_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
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
    if (!companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
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
    });
    // Save the new additional info record
    const savedAdditionalInfo = yield newAdditionalInfo.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAdditionalInfo, "Additional info added successfully");
}));
//get serviceProvider List
exports.getServiceProviderList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const searchQuery = query
        ? {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }
        : {};
    const matchCriteria = Object.assign({ isDeleted: false, userType: "ServiceProvider" }, searchQuery);
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === 'desc' ? -1 : 1;
    const results = yield user_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $lookup: {
                from: "additionalinfos",
                foreignField: "userId",
                localField: "_id",
                as: "additionalInfo"
            }
        },
        {
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress"
            }
        },
        {
            $lookup: {
                from: "teams",
                localField: "_id",
                foreignField: "serviceProviderId",
                as: "teams"
            }
        },
        {
            $unwind: {
                path: "$teams",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "teams.fieldAgentIds",
                foreignField: "_id",
                as: "fieldAgents"
            }
        },
        {
            $addFields: {
                fieldAgentCount: { $size: "$fieldAgents" }
            }
        },
        {
            $project: {
                teams: 0,
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                'additionalInfo.__v': 0,
                'additionalInfo.isDeleted': 0,
                'userAddress.__v': 0,
                'userAddress.isDeleted': 0,
                'fieldAgents.password': 0,
                'fieldAgents.refreshToken': 0,
                'fieldAgents.isDeleted': 0,
                'fieldAgents.__v': 0,
                rawPassword: 0
            }
        },
        { $sort: sortCriteria },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber }
    ]);
    const totalRecords = yield user_model_1.default.countDocuments(matchCriteria);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        serviceProviders: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "ServiceProvider list retrieved successfully.");
}));
//get registered customer list
exports.getRegisteredCustomerList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc" } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";
    console.log("sortBy==");
    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
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
            $project: {
                __v: 0,
                refreshToken: 0,
                password: 0,
                rawPassword: 0
            }
        },
        { $sort: { [sortField]: sortDirection } },
        { $skip: (pageNumber - 1) * pageSize },
        { $limit: pageSize }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        customers,
        pagination: {
            total: totalCustomers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize
        }
    }, "Registered Customers list retrieved successfully.");
}));
//get admin user list
exports.getAdminUsersList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc" } = req.query;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";
    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
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
                rawPassword: 0
            }
        },
        { $sort: { [sortField]: sortDirection } },
        { $skip: (pageNumber - 1) * pageSize },
        { $limit: pageSize }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        adminUsers,
        pagination: {
            total: totalAdminUsers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize
        }
    }, "Admin Users list retrieved successfully.");
}));
//get all users list
exports.getUsers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress"
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
                'userAddress.__v': 0,
                'userAddress.isDeleted': 0,
                rawPassword: 0
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Users retrieved successfully.");
}));
//get single user
exports.getSingleUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    ;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid User ID."));
    }
    ;
    const userDetails = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose_1.default.Types.ObjectId(userId)
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
            $lookup: {
                from: "addresses",
                foreignField: "userId",
                localField: "_id",
                as: "userAddress"
            }
        },
        {
            $lookup: {
                from: "teams",
                foreignField: "serviceProviderId",
                localField: "_id",
                as: "teamDetails"
            }
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
                                { requestProgress: "Pending" }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalFieldAgent: {
                    $reduce: {
                        input: "$teamDetails",
                        initialValue: 0,
                        in: { $add: ["$$value", { $size: "$$this.fieldAgentIds" }] }
                    }
                },
                CompletedServices: {
                    $filter: {
                        input: "$Services",
                        as: "completedServices",
                        cond: { $eq: ["$$completedServices.requestProgress", "Completed"] },
                    }
                },
                newServices: {
                    $filter: {
                        input: "$Services",
                        as: "completedServices",
                        cond: { $eq: ["$$completedServices.requestProgress", "Pending"] },
                    }
                },
            },
        },
        {
            $addFields: {
                totalCompletedServices: { $size: "$CompletedServices" },
                totalNewServices: { $size: "$newServices" }
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
                'userAddress.__v': 0,
                'userAddress.isDeleted': 0,
                teamDetails: 0,
                CompletedServices: 0,
                Services: 0,
                newServices: 0,
                rawPassword: 0
            }
        }
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
    ;
    if (!mongoose_1.default.Types.ObjectId.isValid(serviceProviderId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid Service Provider ID."));
    }
    ;
    const results = yield user_model_1.default.findByIdAndUpdate(serviceProviderId, { $set: { isVerified } }, { new: true }).select('-password -refreshToken -__V');
    if (!results) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider not found."));
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
    ;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid User ID."));
    }
    ;
    const results = yield user_model_1.default.findByIdAndUpdate(userId, { $set: { isDeleted } }, { new: true }).select('-password -refreshToken -__V');
    if (!results) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User not found."));
    }
    ;
    const message = isDeleted ? "User profile made banned." : "User profile made unbanned.";
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
                serviceProviderId: serviceProviderId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "serviceProviderId",
                foreignField: "_id",
                as: "serviceProviderId"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$serviceProviderId",
            }
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
                            as: "agentPermission"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                serviceProviderName: {
                    $concat: ["$serviceProviderId.firstName", " ", "$serviceProviderId.lastName"]
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
                }
            }
        }
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
            fieldAgentIds: { $in: fieldAgentId }
        });
        if (!team) {
            return res.status(400).json({ message: "Field agent not found in the service provider's team." });
        }
        const fieldAgent = yield user_model_1.default.findById(fieldAgentId);
        if ((fieldAgent === null || fieldAgent === void 0 ? void 0 : fieldAgent.userType) === "TeamLead") {
            return (0, response_1.sendSuccessResponse)(res, 200, "This agent is already a teamlead.");
            return res.status(400).json({ message: "This agent is already a teamlead." });
        }
        ;
        const updatedFieldAgent = yield user_model_1.default.findByIdAndUpdate(fieldAgentId, { userType: "TeamLead" }, { new: true });
        if (!updatedFieldAgent) {
            return res.status(500).json({ message: "Failed to update user role to teamlead." });
        }
        return (0, response_1.sendSuccessResponse)(res, 200, updatedFieldAgent, "Field agent promoted to team lead successfully.");
    }
    catch (error) {
        console.error("Error promoting field agent to team lead:", error);
        res.status(500).json({ message: "An error occurred while assigning team lead." });
    }
}));
exports.getAgentEngagementStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceProviderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!serviceProviderId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service provider ID is required."));
    }
    ;
    const results = yield teams_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: serviceProviderId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "fieldAgentIds",
                foreignField: "_id",
                as: "teamMembers"
            }
        },
        {
            $unwind: {
                path: "$teamMembers",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "serviceProviderId",
                foreignField: "_id",
                as: "serviceProviderId"
            }
        },
        {
            $unwind: {
                path: "$serviceProviderId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "services",
                let: { agentId: "$teamMembers._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$assignedAgentId", "$$agentId"],
                            },
                            $and: [
                                { requestProgress: { $ne: "Completed" } },
                                { requestProgress: { $ne: "Cancelled" } }
                            ]
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            serviceZipCode: 1,
                            requestProgress: 1,
                            serviceStartDate: 1
                        },
                    },
                ],
                as: "teamMembers.engagement",
            },
        },
        {
            $addFields: {
                serviceProviderName: {
                    $concat: ["$serviceProviderId.firstName", " ", "$serviceProviderId.lastName"]
                },
                isEngaged: {
                    $cond: {
                        if: {
                            $gt: [{ $size: "$teamMembers.engagement" }, 0]
                        },
                        then: true, else: false
                    }
                }
            }
        },
        {
            $group: {
                _id: "$_id",
                serviceProviderName: { $first: "$$ROOT.serviceProviderName" },
                teamMembers: {
                    $push: {
                        _id: "$teamMembers._id",
                        firstName: "$teamMembers.firstName",
                        lastName: "$teamMembers.lastName",
                        email: "$teamMembers.email",
                        phone: "$teamMembers.phone",
                        userType: "$teamMembers.userType",
                        agentAvatar: "$teamMembers.avatar",
                        // engagement: "$teamMembers.engagement",
                        isEngaged: "$isEngaged"
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
                "teamMembers.__v": 0,
                "teamMembers.isDeleted": 0,
                rawPassword: 0
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
    const iplogs = yield IP_model_1.default.find({ userId: userId })
        .populate({
        path: 'userId',
        select: 'firstName lastName email phone'
    });
    return (0, response_1.sendSuccessResponse)(res, 200, iplogs, "IPlogs retrieved successfully.");
}));
exports.updateUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User ID is required."));
    }
    ;
    const { firstName, lastName } = req.body;
    const userAvtarFile = req.files;
    const userImgFile = (userAvtarFile === null || userAvtarFile === void 0 ? void 0 : userAvtarFile.userImage) ? userAvtarFile.userImage[0] : undefined;
    let userImgUrl;
    if (userImgFile) {
        const userImg = yield (0, cloudinary_1.uploadOnCloudinary)(userImgFile.path);
        userImgUrl = userImg === null || userImg === void 0 ? void 0 : userImg.secure_url;
    }
    const updatedUser = yield user_model_1.default.findByIdAndUpdate({ _id: userId }, {
        $set: Object.assign({ firstName: firstName, lastName: lastName }, (userImgUrl && { avatar: userImgUrl }) // Only update image if uploaded
        ),
    }, { new: true }).select('-rawPassword');
    if (!updatedUser) {
        return (0, response_1.sendSuccessResponse)(res, 200, updatedUser, "User not found for updating.");
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedUser, "User updated Successfully");
}));
exports.getIpLogs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { page = 1, limit = 10, query = '', sortBy = 'timestamp', sortType = 'desc' } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const searchQuery = query
        ? {
            $or: [
                { method: { $regex: query, $options: "i" } },
                { route: { $regex: query, $options: "i" } },
                { hostname: { $regex: query, $options: "i" } },
                { ipAddress: { $regex: query, $options: "i" } }
            ]
        }
        : {};
    const matchCriteria = Object.assign({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }, searchQuery);
    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === 'desc' ? -1 : 1;
    const results = yield IP_model_1.default.aggregate([
        { $match: matchCriteria },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                'userId.__v': 0,
                'userId.isDeleted': 0,
                'userId.password': 0,
                'userId.refreshToken': 0,
                'userId.rawPassword': 0,
                'userId.isVerified': 0,
                'userId.createdAt': 0,
                'userId.updatedAt': 0,
                'userId.fcmToken': 0,
            }
        },
        { $sort: sortCriteria },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber }
    ]);
    const totalRecords = yield IP_model_1.default.countDocuments(matchCriteria);
    return (0, response_1.sendSuccessResponse)(res, 200, {
        ipLogs: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "IPLogs retrieved successfully.");
}));
// Add address for the user
exports.addBankDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { bankName, accountHolderName, branchCode, accountNumber, cardNumber, cardHolderName } = req.body;
    const existingAddress = yield bankDetails_model_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
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
        cardType
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
    ;
    const { notificationPreference } = req.body;
    const updatedUserPreference = yield userPreference_model_1.default.findOneAndUpdate({ userId: userId }, {
        $set: {
            notificationPreference,
            updatedAt: new Date()
        },
    }, { new: true }).select('-__v -isDeleted');
    if (!updatedUserPreference) {
        return (0, response_1.sendSuccessResponse)(res, 200, updatedUserPreference, "User not found for updating.");
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedUserPreference, "User preference updated successfully");
}));
