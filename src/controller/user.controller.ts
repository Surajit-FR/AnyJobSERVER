import fs from 'fs';
import { Request, Response } from "express";
import UserModel from "../models/user.model";
import addressModel from "../models/address.model";
import additionalInfoModel from "../models/userAdditionalInfo.model";
import TeamModel from '../models/teams.model';
import { ApiError } from "../utils/ApisErrors";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response";
import { CustomRequest } from "../../types/commonType";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from 'mongoose';
import { deleteUploadedFiles } from '../middlewares/multer.middleware';


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
            }
        }
    ]);

    return sendSuccessResponse(res, 200,
        userDetails[0],
        "User retrieved successfully.");
});

// Add address for the user
export const addAddress = asyncHandler(async (req: CustomRequest, res: Response) => {

    // Extract address details from request body
    const { street, city, state, zipCode, country, latitude, longitude } = req.body;

    // Validate required fields (you can use Joi or other validation if needed)
    if (!zipCode || !latitude || !longitude) {
        return sendErrorResponse(res, new ApiError(400, "All address fields are required"));
    }

    // Check if user already has an address
    const existingAddress = await addressModel.findOne({ userId: req.user?._id });

    if (existingAddress) {
        return sendErrorResponse(res, new ApiError(400, "Address already exists for this user"));
    }

    // Create a new address
    const newAddress = new addressModel({
        userId: req.user?._id,
        zipCode,
        latitude,
        longitude,
    });

    // Save the address to the database
    const savedAddress = await newAddress.save();

    return sendSuccessResponse(res, 201, savedAddress, "Address added successfully");
});

// Add additional info for the user
// export const addAdditionalInfo = asyncHandler(async (req: CustomRequest, res: Response) => {

//     // Extract additional info details from request body
//     const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;

//     // Check if user already has additional info
//     const existingAdditionalInfo = await additionalInfoModel.findOne({ userId: req.user?._id });

//     if (existingAdditionalInfo) {
//         const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
//         if (!files) {
//             return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
//         };

//         const driverLicenseImageFile =files.driverLicenseImage || [];
//         const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
//         const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
//         const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
//         const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;


//         // Remove local files associated with the existing additional info
//         const filesToRemove = [
//             driverLicenseImageFile,
//             companyLicenseImageFile?.path,
//             licenseProofImageFile?.path,
//             businessLicenseImageFile?.path,
//             businessImageFile?.path
//         ];

//         filesToRemove.forEach((filePath) => {
//             if (filePath) {
//                 fs.unlink(filePath, (err) => {
//                     if (err) {
//                         console.error("Error deleting local file:", err);
//                     }
//                 });
//             }
//         });

//         return sendErrorResponse(res, new ApiError(400, "Additional info already exists for this user"));
//     }

//     // Ensure req.files is defined and has the expected structure
//     const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

//     if (!files) {
//         return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
//     };

//     const driverLicenseImageFile = files.driverLicenseImage ? files.driverLicenseImage[0] : undefined;
//     const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
//     const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
//     const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
//     const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;

//     if (!driverLicenseImageFile || !companyLicenseImageFile || !licenseProofImageFile || !businessLicenseImageFile || !businessImageFile) {
//         return sendErrorResponse(res, new ApiError(400, "All files are required"));
//     };

//     // Upload files to Cloudinary
//     const driverLicenseImage = await uploadOnCloudinary(driverLicenseImageFile?.path as string);
//     const companyLicenseImage = await uploadOnCloudinary(companyLicenseImageFile?.path);
//     const licenseProofImage = await uploadOnCloudinary(licenseProofImageFile.path);
//     const businessLicenseImage = await uploadOnCloudinary(businessLicenseImageFile.path);
//     const businessImage = await uploadOnCloudinary(businessImageFile.path);

//     if (!driverLicenseImage || !companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
//         return sendErrorResponse(res, new ApiError(400, "Error uploading files"));
//     };

//     // Create a new additional info record
//     const newAdditionalInfo = new additionalInfoModel({
//         userId: req.user?._id,
//         companyName,
//         companyIntroduction,
//         DOB,
//         driverLicense,
//         EIN,
//         socialSecurity,
//         companyLicense,
//         insurancePolicy,
//         businessName,
//         driverLicenseImage: driverLicenseImage?.secure_url,
//         companyLicenseImage: companyLicenseImage?.secure_url,
//         licenseProofImage: licenseProofImage?.secure_url,
//         businessLicenseImage: businessLicenseImage?.secure_url,
//         businessImage: businessImage?.secure_url
//     });

//     // Save the additional info to the database
//     const savedAdditionalInfo = await newAdditionalInfo.save();

//     return sendSuccessResponse(res, 201, savedAdditionalInfo, "Additional info added successfully");
// });

export const addAdditionalInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;

    const existingAdditionalInfo = await additionalInfoModel.findOne({ userId: req.user?._id });

    if (existingAdditionalInfo) {
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        if (files) {
            deleteUploadedFiles(files);
        }
        return sendErrorResponse(res, new ApiError(400, "Additional info already exists for this user"));
    }

    const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

    if (!files) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    }

    const driverLicenseImages = files.driverLicenseImage || [];
    const companyLicenseImageFile = files.companyLicenseImage?.[0];
    const licenseProofImageFile = files.licenseProofImage?.[0];
    const businessLicenseImageFile = files.businessLicenseImage?.[0];
    const businessImageFile = files.businessImage?.[0];


    // Ensure all required files are provided
    if (
        driverLicenseImages.length < 2 ||
        !companyLicenseImageFile ||
        !licenseProofImageFile ||
        !businessLicenseImageFile ||
        !businessImageFile
    ) {
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        if (files) {
            deleteUploadedFiles(files);
        }
        return sendErrorResponse(res, new ApiError(400, "All files are required, including two driver license images"));
    }

    // Upload driverLicenseImage files to Cloudinary
    const uploadedDriverLicenseImages = [];
    
    for (const file of driverLicenseImages) {
        const uploadResult = await uploadOnCloudinary(file.path);
        if (!uploadResult) {
            return sendErrorResponse(res, new ApiError(400, "Error uploading driver license images"));
        }
        uploadedDriverLicenseImages.push(uploadResult.secure_url);
    }
    console.log(uploadedDriverLicenseImages);

    // Upload other files to Cloudinary
    const companyLicenseImage = await uploadOnCloudinary(companyLicenseImageFile.path);
    const licenseProofImage = await uploadOnCloudinary(licenseProofImageFile.path);
    const businessLicenseImage = await uploadOnCloudinary(businessLicenseImageFile.path);
    const businessImage = await uploadOnCloudinary(businessImageFile.path);

    if (!companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
        return sendErrorResponse(res, new ApiError(400, "Error uploading other files"));
    }

    // Create a new additional info record
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
        driverLicenseImages: uploadedDriverLicenseImages,
        companyLicenseImage: companyLicenseImage.secure_url,
        licenseProofImage: licenseProofImage.secure_url,
        businessLicenseImage: businessLicenseImage.secure_url,
        businessImage: businessImage.secure_url,
    });

    // Save the additional info to the database
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

    // Convert page and limit to integers
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    // Convert sortType to 1 (ascending) or -1 (descending)
    const sortDirection = sortType === "asc" ? 1 : -1;

    // Ensure sortBy is a string
    const sortField = typeof sortBy === 'string' ? sortBy : "createdAt";

    // Create a search filter for the query (searches by name, email, etc.)
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
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
                'additionalInfo.__v': 0,
                'additionalInfo.isDeleted': 0,
                'userAddress.__v': 0,
                'userAddress.isDeleted': 0,
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
        return sendErrorResponse(res, new ApiError(404, "Service Provider not found."));
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
        return sendErrorResponse(res, new ApiError(404, "User not found."));
    };

    const message = isDeleted ? "User profile made banned." : "User profile made unbanned.";
    return sendSuccessResponse(res, 200, {}, message);
});

export const fetchAssociates = asyncHandler(async (req: Request, res: Response) => {
    const { serviceProviderId } = req.params;
    if (!serviceProviderId) {
        return sendErrorResponse(res, new ApiError(400, "Service provider ID is required."));
    }

    if (!mongoose.Types.ObjectId.isValid(serviceProviderId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid Service provider ID."));
    }

    const results = await TeamModel.aggregate([
        {
            $match: {
                isDeleted: false,
                serviceProviderId: new mongoose.Types.ObjectId(serviceProviderId)
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
            $project: {
                _id: 1,
                serviceProviderId: 1,
                teamMembers: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    userType: 1
                }
            }
        }
    ]);

    if (!results || results.length === 0) {
        return sendErrorResponse(res, new ApiError(404, "Field agents not found."));
    }

    return sendSuccessResponse(res, 200, results, "Field Agent list retrieved successfully.");
});

export const assignTeamLead = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { fieldAgentId } = req.body;
    const serviceProviderId = req.user?._id;

    try {
        // Check if the field agent exists in the service provider's team
        const team = await TeamModel.findOne({
            serviceProviderId,
            fieldAgentIds: { $in: fieldAgentId }
        });
        // console.log({ team });


        if (!team) {
            return res.status(404).json({ message: "Field agent not found in the service provider's team." });
        }

        // Check if the field agent is already a teamlead
        const fieldAgent = await UserModel.findById(fieldAgentId);
        if (fieldAgent?.userType === "teamlead") {
            return res.status(400).json({ message: "This agent is already a teamlead." });
        };

        // Update the field agent's userType to "teamlead"
        const updatedFieldAgent = await UserModel.findByIdAndUpdate(
            fieldAgentId,
            { userType: "teamlead" },
            { new: true }
        );

        if (!updatedFieldAgent) {
            return res.status(500).json({ message: "Failed to update user role to teamlead." });
        }

        res.status(200).json({
            message: "Field agent promoted to team lead successfully.",
            teamLead: updatedFieldAgent
        });
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
                serviceProviderId: { $first: "$_id" },
                teamMembers: {
                    $push: {
                        _id: "$teamMembers._id",
                        firstName: "$teamMembers.firstName",
                        lastName: "$teamMembers.lastName",
                        email: "$teamMembers.email",
                        phone: "$teamMembers.phone",
                        userType: "$teamMembers.userType",
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
            },
        },
    ]);

    if (!results || results.length === 0) {
        return sendErrorResponse(res, new ApiError(404, "Field agents not found."));
    }

    return sendSuccessResponse(res, 200, results, "Field Agent list with engagement status retrieved successfully.");
});