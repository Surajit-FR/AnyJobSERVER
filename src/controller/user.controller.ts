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
    const { userId } = req.params;

    // Extract address details from request body
    const { street, city, state, zipCode, country, latitude, longitude } = req.body;

    // Validate required fields (you can use Joi or other validation if needed)
    if (!zipCode || !latitude || !longitude) {
        return sendErrorResponse(res, new ApiError(400, "All address fields are required"));
    }

    // Check if user already has an address
    const existingAddress = await addressModel.findOne({ userId });

    if (existingAddress) {
        return sendErrorResponse(res, new ApiError(400, "Address already exists for this user"));
    }

    // Create a new address
    const newAddress = new addressModel({
        userId,
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
    const { userId } = req.params;

    // Extract additional info details from request body
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;

    // Check if user already has additional info
    const existingAdditionalInfo = await additionalInfoModel.findOne({ userId });

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
        userId,
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

    const results = await UserModel.aggregate([
        {
            $match: {
                isDeleted: false,
                userType: "ServiceProvider"
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
        "ServiceProvider list retrieved successfully.");
});

//get registered customer list
export const getRegisteredCustomerList = asyncHandler(async (req: Request, res: Response) => {
    const results = await UserModel.aggregate([
        {
            $match: {
                isDeleted: false,
                userType: "Customer"
            }
        },
        {
            $project: {
                __v: 0,
                isDeleted: 0,
                refreshToken: 0,
                password: 0,
            }
        }
    ]);

    return sendSuccessResponse(res, 200,
        results,
        "Registered Customers list retrieved successfully.");
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