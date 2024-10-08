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
exports.addAdditionalInfo = exports.addAddress = exports.getUser = exports.AuthUserSocial = exports.refreshAccessToken = exports.logoutUser = exports.loginUser = exports.registerUser = void 0;
const fs_1 = __importDefault(require("fs"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const address_model_1 = __importDefault(require("../../models/address.model"));
const userAdditionalInfo_model_1 = __importDefault(require("../../models/userAdditionalInfo.model"));
const ApisErrors_1 = require("../../utils/ApisErrors");
const response_1 = require("../../utils/response");
const createTokens_1 = require("../../utils/createTokens");
const ApiResponse_1 = require("../../utils/ApiResponse");
const cloudinary_1 = require("../../utils/cloudinary");
const asyncHandler_1 = require("../../utils/asyncHandler");
const socialAuth_1 = require("../../utils/socialAuth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//register user controller
exports.registerUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, email, password, userType } = req.body;
    // console.log("req.body==>",req.body);
    // return;
    // Validate fields (Joi validation is preferred here)
    if ([firstName, lastName, email, password, userType].some((field) => (field === null || field === void 0 ? void 0 : field.trim()) === "")) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All fields are required"));
    }
    // Check for duplicate user
    const existingUser = yield user_model_1.default.findOne({ email });
    if (existingUser) {
        const files = req.files;
        if (!files) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
        }
        const avatarFile = files.avatar ? files.avatar[0] : undefined;
        if (avatarFile) {
            fs_1.default.unlink(avatarFile.path, (err) => {
                if (err) {
                    console.error("Error deleting local image:", err);
                }
            });
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(409, "User with email already exists"));
    }
    ;
    // Ensure `req.files` is defined and has the expected structure
    const files = req.files;
    let avatarUrl = "";
    if (files && files.avatar) {
        const avatarFile = files.avatar ? files.avatar[0] : undefined;
        // Upload files to Cloudinary
        const avatar = yield (0, cloudinary_1.uploadOnCloudinary)(avatarFile === null || avatarFile === void 0 ? void 0 : avatarFile.path);
        if (!avatar) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Error uploading avatar file"));
        }
        ;
        avatarUrl = avatar.url;
    }
    ;
    // Create new user
    const newUser = new user_model_1.default({
        firstName,
        lastName,
        email,
        password,
        userType,
        avatar: avatarUrl,
    });
    const savedUser = yield newUser.save();
    const createdUser = yield user_model_1.default.findById(savedUser._id).select("-password -refreshToken");
    // console.log(createdUser);
    if (!createdUser) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while registering the user"));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, createdUser, "User Registered Successfully");
}));
//login user controller
exports.loginUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Email is required"));
    }
    ;
    const user = yield user_model_1.default.findOne({ email });
    if (!user) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
    }
    ;
    const userId = user._id;
    const isPasswordValid = yield user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Invalid user credentials"));
    }
    ;
    const { accessToken, refreshToken } = yield (0, createTokens_1.generateAccessAndRefreshToken)(res, user._id);
    const loggedInUser = yield user_model_1.default.findById(user._id).select("-password -refreshToken");
    const cookieOption = {
        httpOnly: true,
        secure: true
    };
    if (user.userType === "ServiceProvider" && !user.isVerified) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Your account verification is under process. Please wait for confirmation.", [], userId));
    }
    ;
    return res.status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json(new ApiResponse_1.ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In successfully"));
}));
//logout user controller
exports.logoutUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user || !((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User not found in request"));
    }
    ;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    yield user_model_1.default.findByIdAndUpdate(userId, {
        $set: { refreshToken: "" }
    }, { new: true });
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };
    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse_1.ApiResponse(200, {}, "User logged out successfully"));
}));
// refreshAccessToken controller
exports.refreshAccessToken = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Unauthorized request"));
    }
    ;
    try {
        const decodedToken = jsonwebtoken_1.default.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = yield user_model_1.default.findById(decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken._id);
        if (!user) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Invalid refresh token"));
        }
        ;
        if ((user === null || user === void 0 ? void 0 : user.refreshToken) !== incomingRefreshToken) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Refresh token is expired or used"));
        }
        ;
        const cookieOption = {
            httpOnly: true,
            secure: true
        };
        const { accessToken, refreshToken } = yield (0, createTokens_1.generateAccessAndRefreshToken)(res, user._id);
        return res.status(200)
            .cookie("accessToken", accessToken, cookieOption)
            .cookie("refreshToken", refreshToken, cookieOption)
            .json(new ApiResponse_1.ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
    }
    catch (exc) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, exc.message || "Invalid refresh token"));
    }
    ;
}));
// Auth user (Social)
const AuthUserSocial = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user object is already attached by the middleware
        let user = req.user;
        // If user object is not attached, it means user needs to be fetched from req.body
        if (!user) {
            const { email, uid, displayName, photoURL, phoneNumber, providerId, userType } = req.body;
            // Check if user already exists in the database
            user = yield user_model_1.default.findOne({ email: email });
            if (!user) {
                // If user doesn't exist, create a new one
                if (providerId === "google.com") {
                    user = yield (0, socialAuth_1.GoogleAuth)(email, uid, displayName, photoURL, phoneNumber, userType);
                }
                else if (providerId === "facebook.com") {
                    return res.status(400).json({ success: false, message: "Facebook login is not supported yet" });
                }
                // Handle error while creating user
                if (user.err) {
                    return res.status(500).json({ success: false, message: user.message, error: user.err });
                }
            }
        }
        // Continue with login logic
        const USER_DATA = Object.assign({}, user._doc);
        const tokenData = (0, createTokens_1.generateAccessAndRefreshToken)(res, USER_DATA._id);
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
                accessToken: (yield tokenData).accessToken, // Assuming tokenData returns accessToken
                refreshToken: (yield tokenData).refreshToken, // Assuming tokenData returns refreshToken
            },
            message: "User logged In successfully",
            success: true,
        });
    }
    catch (exc) {
        console.log(exc.message);
        return res.status(500).json({ success: false, message: "Internal server error", error: exc.message });
    }
});
exports.AuthUserSocial = AuthUserSocial;
// get user if added address and additional info
exports.getUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    // console.log(userId);
    //Find user details
    const userDetails = yield user_model_1.default.findById(userId).select("-password -refreshToken -__v");
    return (0, response_1.sendSuccessResponse)(res, 200, userDetails, "User retrieved successfully.");
}));
// Add address for the user
exports.addAddress = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    // Extract address details from request body
    const { street, city, state, zipCode, country, latitude, longitude } = req.body;
    // Validate required fields (you can use Joi or other validation if needed)
    if (!zipCode || !latitude || !longitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All address fields are required"));
    }
    // Check if user already has an address
    const existingAddress = yield address_model_1.default.findOne({ userId });
    if (existingAddress) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Address already exists for this user"));
    }
    // Create a new address
    const newAddress = new address_model_1.default({
        userId,
        zipCode,
        latitude,
        longitude,
    });
    // Save the address to the database
    const savedAddress = yield newAddress.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAddress, "Address added successfully");
}));
// Add additional info for the user
exports.addAdditionalInfo = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    // Extract additional info details from request body
    const { companyName, companyIntroduction, DOB, driverLicense, EIN, socialSecurity, companyLicense, insurancePolicy, businessName } = req.body;
    // Check if user already has additional info
    const existingAdditionalInfo = yield userAdditionalInfo_model_1.default.findOne({ userId });
    if (existingAdditionalInfo) {
        const files = req.files;
        if (!files) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
        }
        ;
        const driverLicenseImageFile = files.driverLicenseImage ? files.driverLicenseImage[0] : undefined;
        const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
        const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
        const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
        const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;
        // Remove local files associated with the existing additional info
        const filesToRemove = [
            driverLicenseImageFile === null || driverLicenseImageFile === void 0 ? void 0 : driverLicenseImageFile.path,
            companyLicenseImageFile === null || companyLicenseImageFile === void 0 ? void 0 : companyLicenseImageFile.path,
            licenseProofImageFile === null || licenseProofImageFile === void 0 ? void 0 : licenseProofImageFile.path,
            businessLicenseImageFile === null || businessLicenseImageFile === void 0 ? void 0 : businessLicenseImageFile.path,
            businessImageFile === null || businessImageFile === void 0 ? void 0 : businessImageFile.path
        ];
        filesToRemove.forEach((filePath) => {
            if (filePath) {
                fs_1.default.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting local file:", err);
                    }
                });
            }
        });
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Additional info already exists for this user"));
    }
    // Ensure req.files is defined and has the expected structure
    const files = req.files;
    if (!files) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
    }
    ;
    const driverLicenseImageFile = files.driverLicenseImage ? files.driverLicenseImage[0] : undefined;
    const companyLicenseImageFile = files.companyLicenseImage ? files.companyLicenseImage[0] : undefined;
    const licenseProofImageFile = files.licenseProofImage ? files.licenseProofImage[0] : undefined;
    const businessLicenseImageFile = files.businessLicenseImage ? files.businessLicenseImage[0] : undefined;
    const businessImageFile = files.businessImage ? files.businessImage[0] : undefined;
    if (!driverLicenseImageFile || !companyLicenseImageFile || !licenseProofImageFile || !businessLicenseImageFile || !businessImageFile) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "All files are required"));
    }
    ;
    // Upload files to Cloudinary
    const driverLicenseImage = yield (0, cloudinary_1.uploadOnCloudinary)(driverLicenseImageFile === null || driverLicenseImageFile === void 0 ? void 0 : driverLicenseImageFile.path);
    const companyLicenseImage = yield (0, cloudinary_1.uploadOnCloudinary)(companyLicenseImageFile === null || companyLicenseImageFile === void 0 ? void 0 : companyLicenseImageFile.path);
    const licenseProofImage = yield (0, cloudinary_1.uploadOnCloudinary)(licenseProofImageFile.path);
    const businessLicenseImage = yield (0, cloudinary_1.uploadOnCloudinary)(businessLicenseImageFile.path);
    const businessImage = yield (0, cloudinary_1.uploadOnCloudinary)(businessImageFile.path);
    if (!driverLicenseImage || !companyLicenseImage || !licenseProofImage || !businessLicenseImage || !businessImage) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Error uploading files"));
    }
    ;
    // Create a new additional info record
    const newAdditionalInfo = new userAdditionalInfo_model_1.default({
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
        driverLicenseImage: driverLicenseImage === null || driverLicenseImage === void 0 ? void 0 : driverLicenseImage.url,
        companyLicenseImage: companyLicenseImage === null || companyLicenseImage === void 0 ? void 0 : companyLicenseImage.url,
        licenseProofImage: licenseProofImage === null || licenseProofImage === void 0 ? void 0 : licenseProofImage.url,
        businessLicenseImage: businessLicenseImage === null || businessLicenseImage === void 0 ? void 0 : businessLicenseImage.url,
        businessImage: businessImage === null || businessImage === void 0 ? void 0 : businessImage.url
    });
    // Save the additional info to the database
    const savedAdditionalInfo = yield newAdditionalInfo.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedAdditionalInfo, "Additional info added successfully");
}));
