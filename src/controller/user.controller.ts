import fs from 'fs';
import { Request, Response } from "express";
import UserModel from "../models/user.model";
import AddressModel from "../models/address.model";
import additionalInfoModel from "../models/userAdditionalInfo.model";
import TeamModel from '../models/teams.model';
import { ApiError } from "../utils/ApisErrors";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response";
import { CustomRequest } from "../../types/commonType";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from 'mongoose';
import { deleteUploadedFiles } from '../middlewares/multer.middleware';
import IPLog from '../models/IP.model';
import BankDetails from '../models/bankDetails.model';
import { getCardType } from '../utils/auth';
import UserPreferenceModel from '../models/userPreference.model';


// get loggedin user
export const getUser = asyncHandler(async (req: CustomRequest, res: Response) => {

    const userId = req.user?._id as string;

    const userDetails = await UserModel.aggregate([
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
                rawPassword: 0
            }
        }
    ]);

    return sendSuccessResponse(res, 200,
        userDetails[0],
        "User retrieved successfully.");
});

// Add address for the user
export const addAddress = asyncHandler(async (req: CustomRequest, res: Response) => {

    const { zipCode, latitude, longitude, addressType, location } = req.body;

    if (!zipCode || !latitude || !longitude) {
        return sendErrorResponse(res, new ApiError(400, "All address fields are required"));
    }

    const existingAddress = await AddressModel.findOne({ userId: req.user?._id });

    if (existingAddress) {
        return sendErrorResponse(res, new ApiError(400, "Address already exists for this user"));
    }

    const geoLocation = {
        type: "Point",
        coordinates: [longitude, latitude] // [longitude, latitude]
    };
    if (!geoLocation) return sendErrorResponse(res, new ApiError(400, "Location is required."));

    const updateUser = await UserModel.findByIdAndUpdate(
        { _id: req.user?._id },
        { $set: { geoLocation: geoLocation } },
        { new: true }
    );

    const newAddress = new AddressModel({
        userId: req.user?._id,
        zipCode,
        latitude,
        longitude,
        addressType,
        location
    });

    const savedAddress = await newAddress.save();

    return sendSuccessResponse(res, 201, savedAddress, "Address added successfully");
});


export const addAdditionalInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName, phone, totalYearExperience } = req.body;


    // Check if additional info already exists for the user
    const existingAdditionalInfo = await additionalInfoModel.findOne({ userId: req.user?._id });

    if (existingAdditionalInfo) {
        // Delete uploaded files if they exist
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        if (files) {
            deleteUploadedFiles(files);
        }
        return sendErrorResponse(res, new ApiError(400, "Additional info already exists for this user"));
    }

    // Extract files from the request
    const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

    if (!files) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    }

    const companyLicenseImageFile = files.companyLicenseImage?.[0];
    const licenseProofImageFile = files.licenseProofImage?.[0];
    const businessLicenseImageFile = files.businessLicenseImage?.[0];
    const businessImageFile = files.businessImage?.[0];
    const driverLicenseImages = files.driverLicenseImage || [];

    // Ensure all required files are provided
    if (
        !companyLicenseImageFile ||
        !licenseProofImageFile ||
        !businessLicenseImageFile ||
        !businessImageFile ||
        driverLicenseImages.length < 2
    ) {
        // Delete uploaded files if they exist
        if (files) {
            deleteUploadedFiles(files);
        }
        return sendErrorResponse(res, new ApiError(400, "All files are required, including two driver license images"));
    }

    // Upload driver license images to Cloudinary
    const uploadedDriverLicenseImages = [];
    for (const file of driverLicenseImages) {
        const uploadResult = await uploadOnCloudinary(file.path);
        if (!uploadResult) {
            return sendErrorResponse(res, new ApiError(400, "Error uploading driver license images"));
        }
        uploadedDriverLicenseImages.push(uploadResult.secure_url);
    }

    // Upload other files to Cloudinary
    const companyLicenseImage = await uploadOnCloudinary(companyLicenseImageFile.path);
    const licenseProofImage = await uploadOnCloudinary(licenseProofImageFile.path);
    const businessLicenseImage = await uploadOnCloudinary(businessLicenseImageFile.path);
    const businessImage = await uploadOnCloudinary(businessImageFile.path);

    // Ensure all files were uploaded successfully
    if (!companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
        return sendErrorResponse(res, new ApiError(400, "Error uploading other files"));
    }

    // Update phone number and DOB in user data
    const updateUser = await UserModel.findByIdAndUpdate(
        { _id: req.user?._id },
        { $set: { phone, dob: DOB } },
        { new: true }
    );

    // Create new additional info record
    const newAdditionalInfo = new additionalInfoModel({
        userId: req.user?._id,
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
    const savedAdditionalInfo = await newAdditionalInfo.save();

    return sendSuccessResponse(res, 201, savedAdditionalInfo, "Additional info added successfully");
});


//get serviceProvider List
export const getServiceProviderList = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const searchQuery = query
        ? {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }
        : {};

    const matchCriteria = {
        isDeleted: false,
        userType: "ServiceProvider",
        ...searchQuery
    };

    const sortCriteria: any = {};
    sortCriteria[sortBy as string] = sortType === 'desc' ? -1 : 1;

    const results = await UserModel.aggregate([
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

    const totalRecords = await UserModel.countDocuments(matchCriteria);

    return sendSuccessResponse(res, 200, {
        serviceProviders: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "ServiceProvider list retrieved successfully.");
});

//get registered customer list
export const getRegisteredCustomerList = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    const sortDirection = sortType === "asc" ? 1 : -1;

    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";
    console.log("sortBy==",);

    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
    };

    const matchCriteria = {
        userType: "Customer",
        ...searchFilter
    };

    // Fetch the total number of customers before pagination
    const totalCustomers = await UserModel.countDocuments(matchCriteria);

    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / pageSize);

    // Fetch the filtered and paginated results
    const customers = await UserModel.aggregate([
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

    return sendSuccessResponse(res, 200, {
        customers,
        pagination: {
            total: totalCustomers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize
        }
    }, "Registered Customers list retrieved successfully.");
});
//get admin user list
export const getAdminUsersList = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "asc" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    const sortDirection = sortType === "asc" ? 1 : -1;

    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";

    const searchFilter = {
        $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ]
    };

    const matchCriteria = {
        userType: { $in: ["Admin", "Finance"] },
        ...searchFilter
    };

    const totalAdminUsers = await UserModel.countDocuments(matchCriteria);

    const totalPages = Math.ceil(totalAdminUsers / pageSize);

    const adminUsers = await UserModel.aggregate([
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

    return sendSuccessResponse(res, 200, {
        adminUsers,
        pagination: {
            total: totalAdminUsers,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize
        }
    }, "Admin Users list retrieved successfully.");
});

//get all users list
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
    const results = await UserModel.aggregate([
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

    return sendSuccessResponse(res, 200,
        results,
        "Users retrieved successfully.");
});

//get single user
export const getSingleUser = asyncHandler(async (req: Request, res: Response) => {

    const { userId } = req.params;

    if (!userId) {
        return sendErrorResponse(res, new ApiError(400, "User ID is required."));
    };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid User ID."));
    };

    const userDetails = await UserModel.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: new mongoose.Types.ObjectId(userId)
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

    return sendSuccessResponse(res, 200,
        userDetails[0],
        "User retrieved successfully.");
});

// verifyServiceProvider controller
export const verifyServiceProvider = asyncHandler(async (req: Request, res: Response) => {
    const { serviceProviderId } = req.params;
    const { isVerified }: { isVerified: boolean } = req.body;

    if (!serviceProviderId) {
        return sendErrorResponse(res, new ApiError(400, "Service Provider ID is required."));
    };

    if (!mongoose.Types.ObjectId.isValid(serviceProviderId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid Service Provider ID."));
    };

    const results = await UserModel.findByIdAndUpdate(
        serviceProviderId,
        { $set: { isVerified } },
        { new: true }
    ).select('-password -refreshToken -__V');

    if (!results) {
        return sendErrorResponse(res, new ApiError(400, "Service Provider not found."));
    }

    const message = isVerified
        ? "Service Provider profile verified successfully."
        : "Service Provider profile made unverified.";

    return sendSuccessResponse(res, 200, {}, message);
});

// banUser controller
export const banUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { isDeleted }: { isDeleted: boolean } = req.body;

    if (!userId) {
        return sendErrorResponse(res, new ApiError(400, "User ID is required."));
    };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid User ID."));
    };

    const results = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { isDeleted } },
        { new: true }
    ).select('-password -refreshToken -__V');

    if (!results) {
        return sendErrorResponse(res, new ApiError(400, "User not found."));
    };

    const message = isDeleted ? "User profile made banned." : "User profile made unbanned.";
    return sendSuccessResponse(res, 200, {}, message);
});

export const fetchAssociates = asyncHandler(async (req: CustomRequest, res: Response) => {
    const serviceProviderId = req.user?._id;
    if (!serviceProviderId) {
        return sendErrorResponse(res, new ApiError(400, "Service provider ID is required."));
    }

    const results = await TeamModel.aggregate([
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
        return sendErrorResponse(res, new ApiError(400, "Field agents not found."));
    }

    return sendSuccessResponse(res, 200, results, "Field Agent list retrieved successfully.");
});

export const assignTeamLead = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { fieldAgentId } = req.body;
    const serviceProviderId = req.user?._id;

    try {
        const team = await TeamModel.findOne({
            serviceProviderId,
            fieldAgentIds: { $in: fieldAgentId }
        });


        if (!team) {
            return res.status(400).json({ message: "Field agent not found in the service provider's team." });
        }

        const fieldAgent = await UserModel.findById(fieldAgentId);
        if (fieldAgent?.userType === "TeamLead") {
            return sendSuccessResponse(res, 200, "This agent is already a teamlead.");
            return res.status(400).json({ message: "This agent is already a teamlead." });
        };

        const updatedFieldAgent = await UserModel.findByIdAndUpdate(
            fieldAgentId,
            { userType: "TeamLead" },
            { new: true }
        );

        if (!updatedFieldAgent) {
            return res.status(500).json({ message: "Failed to update user role to teamlead." });
        }

        return sendSuccessResponse(res, 200, updatedFieldAgent, "Field agent promoted to team lead successfully.");
    } catch (error) {
        console.error("Error promoting field agent to team lead:", error);
        res.status(500).json({ message: "An error occurred while assigning team lead." });
    }
});

export const getAgentEngagementStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const serviceProviderId = req.user?._id;
    if (!serviceProviderId) {
        return sendErrorResponse(res, new ApiError(400, "Service provider ID is required."));
    };

    const results = await TeamModel.aggregate([
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
        return sendErrorResponse(res, new ApiError(400, "Field agents not found."));
    }

    return sendSuccessResponse(res, 200, results, "Field Agent list with engagement status retrieved successfully.");
});

// fetch IPlogs for admin
export const fetchIPlogs = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id
    if (!userId) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    }

    const iplogs = await IPLog.find({ userId: userId })
        .populate({
            path: 'userId',
            select: 'firstName lastName email phone'
        });
    return sendSuccessResponse(res, 200,
        iplogs,
        "IPlogs retrieved successfully.");

});


export const updateUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
        return sendErrorResponse(res, new ApiError(400, "User ID is required."));
    };

    const { firstName, lastName }: { firstName: string, lastName: string } = req.body;
    const userAvtarFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
    const userImgFile = userAvtarFile?.userImage ? userAvtarFile.userImage[0] : undefined;

    let userImgUrl;
    if (userImgFile) {
        const userImg = await uploadOnCloudinary(userImgFile.path);
        userImgUrl = userImg?.secure_url;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
        { _id: userId },
        {
            $set: {
                firstName: firstName,
                lastName: lastName,
                ...(userImgUrl && { avatar: userImgUrl }) // Only update image if uploaded
            },
        },
        { new: true }
    ).select('-rawPassword');

    if (!updatedUser) {
        return sendSuccessResponse(res, 200, updatedUser, "User not found for updating.");
    };

    return sendSuccessResponse(res, 200, updatedUser, "User updated Successfully");
});

export const getIpLogs = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { page = 1, limit = 10, query = '', sortBy = 'timestamp', sortType = 'desc' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

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

    const matchCriteria = {
        userId: req.user?._id,
        ...searchQuery
    };

    const sortCriteria: any = {};
    sortCriteria[sortBy as string] = sortType === 'desc' ? -1 : 1;

    const results = await IPLog.aggregate([
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

    const totalRecords = await IPLog.countDocuments(matchCriteria);

    return sendSuccessResponse(res, 200, {
        ipLogs: results,
        pagination: {
            total: totalRecords,
            page: pageNumber,
            limit: limitNumber
        }
    }, "IPLogs retrieved successfully.");
});

// Add address for the user
export const addBankDetails = asyncHandler(async (req: CustomRequest, res: Response) => {

    const { bankName, accountHolderName, branchCode, accountNumber, cardNumber, cardHolderName } = req.body;



    const existingAddress = await BankDetails.findOne({ userId: req.user?._id });

    if (existingAddress) {
        return sendErrorResponse(res, new ApiError(400, "Bank Details already exists for this user"));
    }

    var cardType = getCardType(cardNumber ? cardNumber : "visa")


    const userAddress = new BankDetails({
        userId: req.user?._id,
        bankName,
        accountHolderName,
        branchCode,
        accountNumber,
        cardNumber,
        cardHolderName,
        cardType
    });

    const savedBankDetails = await userAddress.save();

    return sendSuccessResponse(res, 201, savedBankDetails, "Bank Details added successfully");
});

export const updateUserPreference = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;    

    if (!userId) {
        return sendErrorResponse(res, new ApiError(400, "User ID is required."));
    };

    const { notificationPreference }: { notificationPreference: Boolean } = req.body;

    const updatedUserPreference = await UserPreferenceModel.findOneAndUpdate(
        { userId: userId },
        {
            $set: {
                notificationPreference,
                updatedAt: new Date()
            },
        },
        { new: true }
    ).select('-__v -isDeleted');

    if (!updatedUserPreference) {
        return sendSuccessResponse(res, 200, updatedUserPreference, "User not found for updating.");
    };

    return sendSuccessResponse(res, 200, updatedUserPreference, "User preference updated successfully");
});