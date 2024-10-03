import { Request, Response } from "express";
import UserModel from "../../models/user.model";
import addressModel from "../../models/address.model";
import additionalInfoModel from "../../models/userAdditionalInfo.model";
import { ApiError } from "../../utils/ApisErrors";
import { ICredentials, ILoginCredentials, IRegisterCredentials } from "../../../types/requests_responseType";
import { sendSuccessResponse, sendErrorResponse } from "../../utils/response";
import { generateAccessAndRefreshToken } from "../../utils/createTokens";
import { CustomRequest } from "../../../types/commonType";
import { ApiResponse } from "../../utils/ApiResponse";
import { uploadOnCloudinary } from "../../utils/cloudinary";
import { asyncHandler } from "../../utils/asyncHandler";
import { IUser } from "../../../types/schemaTypes";
import { GoogleAuth } from "../../utils/socialAuth"
import jwt, { JwtPayload } from 'jsonwebtoken';
import mongoose from "mongoose";



//register user controller
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, userType }: IRegisterCredentials = req.body;
    // console.log("req.body==>",req.body);
    // return;


    // Validate fields (Joi validation is preferred here)
    if ([firstName, lastName, email, password, userType].some((field) => field?.trim() === "")) {
        return sendErrorResponse(res, new ApiError(400, "All fields are required"));
    }

    // Check for duplicate user
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        return sendErrorResponse(res, new ApiError(409, "User with email already exists"));
    };

    // Ensure `req.files` is defined and has the expected structure
    const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

    let avatarUrl = ""
    if (files && files.avatar) {
        const avatarFile = files.avatar ? files.avatar[0] : undefined;
        
        // Upload files to Cloudinary
        const avatar = await uploadOnCloudinary(avatarFile?.path as string);
        if (!avatar) {
            return sendErrorResponse(res, new ApiError(400, "Error uploading avatar file"));
        };

        avatarUrl = avatar.url
    };

    // Create new user
    const newUser = new UserModel({
        firstName,
        lastName,
        email,
        password,
        userType,
        avatar: avatarUrl,
    });
    const savedUser = await newUser.save()

    const createdUser = await UserModel.findById(savedUser._id).select("-password -refreshToken");
    console.log(createdUser);

    if (!createdUser) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while registering the user"));
    };

    return sendSuccessResponse(res, 201, createdUser, "User Registered Successfully");
});



//login user controller
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: IUser = req.body;

    if (!email) {
        return sendErrorResponse(res, new ApiError(400, "Email is required"));
    };

    const user = await UserModel.findOne({ email }
    );
    if (!user) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    };

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return sendErrorResponse(res, new ApiError(403, "Invalid user credentials"));
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);
    const loggedInUser = await UserModel.findById(user._id).select("-password -refreshToken");

    const cookieOption: { httpOnly: boolean, secure: boolean } = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json
        (
            new ApiResponse
                (
                    200,
                    { user: loggedInUser, accessToken, refreshToken },
                    "User logged In successfully"
                )
        );
});

//logout user controller
export const logoutUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user || !req.user?._id) {
        return sendErrorResponse(res, new ApiError(400, "User not found in request"));
    };

    const userId = req.user?._id;

    await UserModel.findByIdAndUpdate(
        userId,
        {
            $set: { refreshToken: "" }
        },
        { new: true }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
    };

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// refreshAccessToken controller
export const refreshAccessToken = asyncHandler(async (req: CustomRequest, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        return sendErrorResponse(res, new ApiError(401, "Unauthorized request"));
    };

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload;
        const user = await UserModel.findById(decodedToken?._id);

        if (!user) {
            return sendErrorResponse(res, new ApiError(401, "Invalid refresh token"));
        };

        if (user?.refreshToken !== incomingRefreshToken) {
            return sendErrorResponse(res, new ApiError(401, "Refresh token is expired or used"));
        };

        const cookieOption: { httpOnly: boolean, secure: boolean } = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);

        return res.status(200)
            .cookie("accessToken", accessToken, cookieOption)
            .cookie("refreshToken", refreshToken, cookieOption)
            .json
            (
                new ApiResponse
                    (
                        200,
                        { accessToken, refreshToken },
                        "Access token refreshed"
                    )
            );
    } catch (exc: any) {
        return sendErrorResponse(res, new ApiError(401, exc.message || "Invalid refresh token"));
    };
});

// Auth user (Social)
export const AuthUserSocial = async (req: CustomRequest, res: Response) => {
    try {
        // Check if user object is already attached by the middleware
        let user: any = req.user;

        // If user object is not attached, it means user needs to be fetched from req.body
        if (!user) {
            const { email, uid, displayName, photoURL, phoneNumber, providerId, userType } = req.body;

            // Check if user already exists in the database
            user = await UserModel.findOne({ email: email });

            if (!user) {
                // If user doesn't exist, create a new one
                if (providerId === "google.com") {
                    user = await GoogleAuth(email, uid, displayName, photoURL, phoneNumber, userType);
                } else if (providerId === "facebook.com") {
                    return res.status(400).json({ success: false, message: "Facebook login is not supported yet" });
                }

                // Handle error while creating user
                if (user.err) {
                    return res.status(500).json({ success: false, message: user.message, error: user.err });
                }
            }
        }

        // Continue with login logic
        const USER_DATA = { ...user._doc };
        const tokenData = generateAccessAndRefreshToken(res, USER_DATA._id);

        // Format the response as per the provided JSON structure
        return res.status(200).json({
            statusCode: 200,
            data: {
                user: {
                    _id: USER_DATA._id,
                    firstName: USER_DATA.firstName,
                    lastName: USER_DATA.lastName,
                    email: USER_DATA.email,
                    avatar: USER_DATA.avatar, // Add avatar if it's in USER_DATA
                    userType: USER_DATA.userType, // Ensure this is available in USER_DATA
                    isDeleted: false, // You might want to set this dynamically based on your logic
                    createdAt: USER_DATA.createdAt, // Ensure this is available in USER_DATA
                    updatedAt: USER_DATA.updatedAt, // Ensure this is available in USER_DATA
                    __v: USER_DATA.__v, // Ensure this is available in USER_DATA
                },
                accessToken: (await tokenData).accessToken, // Assuming tokenData returns accessToken
                refreshToken: (await tokenData).refreshToken, // Assuming tokenData returns refreshToken
            },
            message: "User logged In successfully",
            success: true,

        });

    } catch (exc: any) {
        console.log(exc.message);
        return res.status(500).json({ success: false, message: "Internal server error", error: exc.message });
    }
};

//get user if added address and additional info
// get user if added address and additional info
export const getUser = asyncHandler(async (req: CustomRequest, res: Response) => {

    const userId = req.user?._id as string;
    console.log(userId);

    // Find the additional info for the user
    const additionalInfo = await additionalInfoModel.findOne({ userId: userId });

    // Find the address for the user
    const address = await addressModel.findOne({ userId: userId });

    // Check if additional info or address exists
    const isAdditionalInfoAdded = additionalInfo !== null;
    const isAddressAdded = address !== null;

    return sendSuccessResponse(res, 200, {
        isAdditionalInfoAdded,
        isAddressAdded,
    }, "User  status retrieved successfully.");
});

// Add address for the user
export const addAddress = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id as string;

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
    const userId = req.user?._id as string;

    // Extract additional info details from request body
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;

    // Validate required fields (you can use Joi or other validation if needed)
    // if (!companyName || !companyIntroduction || !DOB || !driverLicense || !EIN || !companyLicense || !insurancePolicy || !businessName) {
    //     return sendErrorResponse(res, new ApiError(400, "All additional info fields are required"));
    // }

    // Check if user already has additional info
    const existingAdditionalInfo = await additionalInfoModel.findOne({ userId });

    if (existingAdditionalInfo) {
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
        return sendErrorResponse(res, new ApiError(400, "file is required"));
    };
    console.log("============");

    // // Upload files to Cloudinary
    const driverLicenseImage = await uploadOnCloudinary(driverLicenseImageFile?.path as string);
    const companyLicenseImage = await uploadOnCloudinary(companyLicenseImageFile?.path);
    const licenseProofImage = await uploadOnCloudinary(licenseProofImageFile.path);
    const businessLicenseImage = await uploadOnCloudinary(businessLicenseImageFile.path);
    const businessImage = await uploadOnCloudinary(businessImageFile.path);

    // console.log(driverLicenseImage);
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






