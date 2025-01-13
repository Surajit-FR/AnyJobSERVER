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
exports.sendOTPEmail = exports.resetPassword = exports.forgetPassword = exports.AuthUserSocial = exports.refreshAccessToken = exports.logoutUser = exports.saveFcmToken = exports.loginUser = exports.registerUser = exports.createAdminUsers = exports.addAssociate = exports.cookieOption = exports.fetchUserData = void 0;
const user_model_1 = __importDefault(require("../../models/user.model"));
const ApisErrors_1 = require("../../utils/ApisErrors");
const auth_1 = require("../../utils/auth");
const response_1 = require("../../utils/response");
const createTokens_1 = require("../../utils/createTokens");
const ApiResponse_1 = require("../../utils/ApiResponse");
const asyncHandler_1 = require("../../utils/asyncHandler");
const socialAuth_1 = require("../../utils/socialAuth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const teams_model_1 = __importDefault(require("../../models/teams.model"));
const permission_model_1 = __importDefault(require("../../models/permission.model"));
const sendMail_1 = require("../../utils/sendMail");
const otp_controller_1 = require("../otp.controller");
const otp_model_1 = __importDefault(require("../../models/otp.model"));
const address_model_1 = __importDefault(require("../../models/address.model"));
const userAdditionalInfo_model_1 = __importDefault(require("../../models/userAdditionalInfo.model"));
// fetchUserData func.
const fetchUserData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: userId
            }
        },
        {
            $lookup: {
                from: "permissions",
                foreignField: "userId",
                localField: "_id",
                as: "permission"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$permission"
            }
        },
        {
            $project: {
                'permission.userId': 0,
                'permission.isDeleted': 0,
                'permission.createdAt': 0,
                'permission.updatedAt': 0,
                'permission.__v': 0,
                password: 0,
                refreshToken: 0
            }
        }
    ]);
    return user;
});
exports.fetchUserData = fetchUserData;
// Set cookieOption
exports.cookieOption = {
    httpOnly: true,
    secure: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 Day
    sameSite: 'strict'
};
// addAssociate controller
exports.addAssociate = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userData = req.body;
    const userType = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userType;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    let serviceProviderId = userId;
    if (userType === "TeamLead") {
        const permissions = yield permission_model_1.default.findOne({ userId }).select('fieldAgentManagement');
        if (!(permissions === null || permissions === void 0 ? void 0 : permissions.fieldAgentManagement)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, 'Permission denied: Field Agent Management not granted.'));
        }
        const team = yield teams_model_1.default.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Service Provider ID not found in team.'));
        }
        serviceProviderId = team.serviceProviderId;
    }
    const savedAgent = yield (0, auth_1.addUser)(userData);
    if (userData.userType === "FieldAgent") {
        const team = yield teams_model_1.default.findOneAndUpdate({ serviceProviderId }, { $push: { fieldAgentIds: savedAgent._id } }, { new: true, upsert: true });
        if (!team) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Service Provider team not found."));
        }
    }
    return (0, response_1.sendSuccessResponse)(res, 200, savedAgent, `${userData.userType} added successfully.`);
}));
//add admin Users
exports.createAdminUsers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = req.body;
    const savedUser = yield (0, auth_1.addUser)(userData);
    return (0, response_1.sendSuccessResponse)(res, 200, savedUser, `${userData.userType} added successfully.`);
}));
// register user controller
exports.registerUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = req.body;
    const savedUser = yield (0, auth_1.addUser)(userData);
    if (userData.userType === 'ServiceProvider') {
        const newTeam = new teams_model_1.default({
            serviceProviderId: savedUser._id,
            fieldAgents: []
        });
        const savedTeam = yield newTeam.save();
        if (!savedTeam) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "ServiceProvider team not created"));
        }
    }
    const newUser = yield (0, exports.fetchUserData)(savedUser._id);
    const { accessToken, refreshToken } = yield (0, createTokens_1.generateAccessAndRefreshToken)(res, savedUser._id);
    return res.status(200)
        .cookie("accessToken", accessToken, exports.cookieOption)
        .cookie("refreshToken", refreshToken, exports.cookieOption)
        .json({
        statusCode: 200,
        data: {
            user: newUser[0],
            accessToken,
            refreshToken
        },
        message: "User Registered Successfully",
        success: true
    });
}));
// login user controller
exports.loginUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, userType, fcmToken, isAdminPanel } = req.body;
    if (!email) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Email is required"));
    }
    ;
    const user = yield user_model_1.default.findOne({ email });
    if (!user) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
    }
    ;
    if (userType && !userType.includes(user.userType)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Access denied"));
    }
    ;
    const userId = user._id;
    const isPasswordValid = yield user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Invalid user credentials"));
    }
    ;
    if (user.isDeleted) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Your account is banned from a AnyJob."));
    }
    ;
    // Check for admin panel access
    if (isAdminPanel) {
        if (user.userType !== 'SuperAdmin') {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Access denied. Only SuperAdmins can log in to the admin panel."));
        }
    }
    // Save FCM Token if provided
    if (fcmToken) {
        user.fcmToken = fcmToken;
        yield user.save();
    }
    const { accessToken, refreshToken } = yield (0, createTokens_1.generateAccessAndRefreshToken)(res, user._id);
    const loggedInUser = yield (0, exports.fetchUserData)(user._id);
    if (user.userType === "ServiceProvider") {
        const userAddress = yield address_model_1.default.findOne({ userId: user._id });
        const userAdditionalInfo = yield userAdditionalInfo_model_1.default.findOne({ userId: user._id });
        if (!userAddress && !userAdditionalInfo) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Your account is created but please add address & your additional information.", [], { accessToken }));
        }
        else {
            if (!user.isVerified) {
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, "Your account verification is under process. Please wait for confirmation.", [], { accessToken }));
            }
            ;
        }
    }
    ;
    return res.status(200)
        .cookie("accessToken", accessToken, exports.cookieOption)
        .cookie("refreshToken", refreshToken, exports.cookieOption)
        .json(new ApiResponse_1.ApiResponse(200, { user: loggedInUser[0], accessToken, refreshToken }, "User logged In successfully"));
}));
//save fcm token in user data
exports.saveFcmToken = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { fcmToken } = req.body;
    if (!fcmToken || !userId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, 'Missing FCM token or user ID'));
    }
    const user = yield user_model_1.default.findById(userId);
    if (!user) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
    }
    user.fcmToken = fcmToken;
    yield user.save();
    return (0, response_1.sendSuccessResponse)(res, 200, 'FCM token saved successfully');
}));
// logout user controller
exports.logoutUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user || !((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User not found in request"));
    }
    ;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
    yield user_model_1.default.findByIdAndUpdate(userId, {
        $set: {
            refreshToken: "",
            fcmToken: ""
        }
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
    var _a;
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken || ((_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", ""));
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
exports.AuthUserSocial = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
//---------------FORGET PASSWORD CONTROLLERS-------------//
//-------------1.send verification code to given mail 
exports.forgetPassword = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Email is required"));
    }
    ;
    const checkEmail = yield user_model_1.default.findOne({ email });
    if (!checkEmail) {
        return (0, response_1.sendSuccessResponse)(res, 200, "Email does not exist");
    }
    ;
    const receiverEmail = checkEmail.email;
    const verificationCode = (0, otp_controller_1.generateVerificationCode)(5);
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // Expires in 15 minutes
    yield otp_model_1.default.create({
        userId: checkEmail._id,
        email: receiverEmail,
        otp: verificationCode,
        expiredAt
    });
    const to = receiverEmail;
    const subject = "Verification code to reset password of your account";
    const html = `Dear ${checkEmail.firstName} ${checkEmail.lastName},</br>
  Thank you for joining us. You have requested OTP to reset your password. Please use this code to verify your account.Your verification code for reset password is:
</br>
  <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
    <b><h2 style="margin: 5px 0;">Verification Code: ${verificationCode}</h2></b>
  </div>`;
    yield (0, sendMail_1.sendMail)(to, subject, html);
    return res.status(200).json(new ApiResponse_1.ApiResponse(200, "Verification code sent to given email successfully"));
}));
//-------------2.verify otp
//-------------3.Reset Password
exports.resetPassword = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    // const userId = req.user?._id;
    if (!email) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "email is required"));
    }
    ;
    const userDetails = yield user_model_1.default.findOne({ email });
    if (!userDetails) {
        return (0, response_1.sendSuccessResponse)(res, 200, "User not found");
    }
    ;
    // Update the password
    userDetails.password = req.body.password;
    userDetails.rawPassword = req.body.password;
    yield userDetails.save();
    return (0, response_1.sendSuccessResponse)(res, 200, "Password reset successfull");
}));
//verify email during sign up by email
exports.sendOTPEmail = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Email is required"));
    }
    ;
    const verificationCode = (0, otp_controller_1.generateVerificationCode)(5);
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes
    yield otp_model_1.default.create({
        // userId: email,
        email: email,
        otp: verificationCode,
        expiredAt
    });
    const to = email;
    const subject = "Verification code to reset password of your account";
    const html = `Dear User,</br>
  Please verify your email address to complete your registration.Your verification code is:
</br>
  <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
    <b><h2 style="margin: 5px 0;">Verification Code: ${verificationCode}</h2></b>
  </div>`;
    yield (0, sendMail_1.sendMail)(to, subject, html);
    return res.status(200).json(new ApiResponse_1.ApiResponse(200, "Verification code sent to given email successfully"));
}));
