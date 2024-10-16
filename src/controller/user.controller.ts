import fs from 'fs';
import { Request, Response } from "express";
import UserModel from "../models/user.model";
import addressModel from "../models/address.model";
import additionalInfoModel from "../models/userAdditionalInfo.model";
import { ApiError } from "../utils/ApisErrors";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response";
import { CustomRequest } from "../../types/commonType";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { asyncHandler } from "../utils/asyncHandler";


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
    const existingAddress = await addressModel.findOne({ userId:req.user?._id });

    if (existingAddress) {
        return sendErrorResponse(res, new ApiError(400, "Address already exists for this user"));
    }

    // Create a new address
    const newAddress = new addressModel({
        userId:req.user?._id,
        zipCode,
        latitude,
        longitude,
    });

    // Save the address to the database
    const savedAddress = await newAddress.save();

    return sendSuccessResponse(res, 201, savedAddress, "Address added successfully");
});

// Add additional info for the user
export const addAdditionalInfo = asyncHandler(async (req: CustomRequest, res: Response) => {

    // Extract additional info details from request body
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;

    // Check if user already has additional info
    const existingAdditionalInfo = await additionalInfoModel.findOne({ userId:req.user?._id });

    if (existingAdditionalInfo) {
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        if (!files) {
            return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
        };

        const driverLicenseImageFile = files.driverLicenseImage ? files.driverLicenseImage[0] : undefined;
        const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
        const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
        const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
        const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;


        // Remove local files associated with the existing additional info
        const filesToRemove = [
            driverLicenseImageFile?.path,
            companyLicenseImageFile?.path,
            licenseProofImageFile?.path,
            businessLicenseImageFile?.path,
            businessImageFile?.path
        ];

        filesToRemove.forEach((filePath) => {
            if (filePath) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting local file:", err);
                    }
                });
            }
        });

        return sendErrorResponse(res, new ApiError(400, "Additional info already exists for this user"));
    }

    // Ensure req.files is defined and has the expected structure
    const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

    if (!files) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    };

    const driverLicenseImageFile = files.driverLicenseImage ? files.driverLicenseImage[0] : undefined;
    const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
    const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
    const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
    const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;

    if (!driverLicenseImageFile || !companyLicenseImageFile || !licenseProofImageFile || !businessLicenseImageFile || !businessImageFile) {
        return sendErrorResponse(res, new ApiError(400, "All files are required"));
    };

    // Upload files to Cloudinary
    const driverLicenseImage = await uploadOnCloudinary(driverLicenseImageFile?.path as string);
    const companyLicenseImage = await uploadOnCloudinary(companyLicenseImageFile?.path);
    const licenseProofImage = await uploadOnCloudinary(licenseProofImageFile.path);
    const businessLicenseImage = await uploadOnCloudinary(businessLicenseImageFile.path);
    const businessImage = await uploadOnCloudinary(businessImageFile.path);

    if (!driverLicenseImage || !companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
        return sendErrorResponse(res, new ApiError(400, "Error uploading files"));
    };

    // Create a new additional info record
    const newAdditionalInfo = new additionalInfoModel({
        userId:req.user?._id,
        companyName,
        companyIntroduction,
        DOB,
        driverLicense,
        EIN,
        socialSecurity,
        companyLicense,
        insurancePolicy,
        businessName,
        driverLicenseImage: driverLicenseImage?.url,
        companyLicenseImage: companyLicenseImage?.url,
        licenseProofImage: licenseProofImage?.url,
        businessLicenseImage: businessLicenseImage?.url,
        businessImage: businessImage?.url
    });

    // Save the additional info to the database
    const savedAdditionalInfo = await newAdditionalInfo.save();

    return sendSuccessResponse(res, 201, savedAdditionalInfo, "Additional info added successfully");
});

//get serviceProvider List
export const getServiceProviderList = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc' } = req.query;

    // Convert `page` and `limit` to numbers, if not provided, default values are used
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Handle search query
    const searchQuery = query
        ? {
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { lastName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }
        : {};

    // Build the match criteria
    const matchCriteria = {
        isDeleted: false,
        userType: "ServiceProvider",
        ...searchQuery
    };

    // Handle sorting, default sorting is by createdAt in descending order
    const sortCriteria: any = {};
    sortCriteria[sortBy as string] = sortType === 'desc' ? -1 : 1;

    // Get the data using aggregation
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
        },
        { $sort: sortCriteria },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber }
    ]);

    // Count total records for pagination
    const totalRecords = await UserModel.countDocuments(matchCriteria);

    // Send the response
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
        isDeleted: false,
        userType: "Customer",
        ...searchFilter
    };

    // Fetch the total number of customers before pagination
    const totalCustomers = await UserModel.countDocuments(matchCriteria);

    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / pageSize);

    // Fetch the filtered and paginated results
    const customers = await UserModel.aggregate([
        {
            $match: matchCriteria
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
            }
        },
        {
            $sort: { [sortField]: sortDirection }
        },
        {
            $skip: (pageNumber - 1) * pageSize
        },
        {
            $limit: pageSize
        }
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