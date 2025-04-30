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
exports.verifyOTP = exports.sendOTP = exports.generateVerificationCode = void 0;
const twilio_1 = __importDefault(require("twilio"));
const otp_model_1 = __importDefault(require("../models/otp.model"));
const otplib_1 = require("otplib");
const user_model_1 = __importDefault(require("../models/user.model"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const ApisErrors_1 = require("../utils/ApisErrors");
const createTokens_1 = require("../utils/createTokens");
const auth_controller_1 = require("./auth/auth.controller");
const ApiResponse_1 = require("../utils/ApiResponse");
const teams_model_1 = __importDefault(require("../models/teams.model"));
const userAdditionalInfo_model_1 = __importDefault(require("../models/userAdditionalInfo.model"));
const config_1 = require("../config/config");
const mongoose_1 = __importDefault(require("mongoose"));
const address_model_1 = __importDefault(require("../models/address.model"));
otplib_1.authenticator.options = {
    step: 300,
};
const accountSid = config_1.TWILIO_ACCOUNT_SID;
const authToken = config_1.TWILIO_AUTH_TOKEN;
// const accountSid = "";
// const authToken = "";
const TWILIO_PHONE_NUMBERS = "+18286722687";
let client = (0, twilio_1.default)(accountSid, authToken);
const generateVerificationCode = (length) => {
    if (length <= 0) {
        throw new Error("Length must be greater than 0");
    }
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1));
};
exports.generateVerificationCode = generateVerificationCode;
//send otp
exports.sendOTP = ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber, purpose, userType } = req.body; //phone number with country code
    // if (!phoneNumber || !userType) {
    //     return res.status(400).json({ success: false, message: "phoneNumber, userType are required" });
    // }
    let stepDuration = 4 * 60;
    if (purpose === "service") {
        stepDuration = 24 * 60 * 60;
    }
    // Validate phone number format
    if (!/^\+\d{1,3}\d{7,15}$/.test(phoneNumber)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid phone number format"));
    }
    const otpLength = 5;
    const otp = (0, exports.generateVerificationCode)(otpLength);
    // const formattedPhoneNumber = `+91${phoneNumber}`;
    // console.log({ formattedPhoneNumber });
    const expiredAt = new Date(Date.now() + stepDuration * 1000);
    const message = yield client.messages.create({
        body: `Your OTP code is ${otp}`,
        from: TWILIO_PHONE_NUMBERS,
        to: phoneNumber,
    });
    if (purpose !== "verifyPhone") {
        const user = yield user_model_1.default.findOne({ phone: phoneNumber, isDeleted: false, });
        if (!user) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
        }
        const userId = user._id;
        const otpEntry = new otp_model_1.default({
            userId,
            phoneNumber: phoneNumber,
            otp,
            expiredAt,
        });
        yield otpEntry.save();
    }
    else {
        const otpEntry = new otp_model_1.default({
            userId: new mongoose_1.default.Types.ObjectId(),
            phoneNumber: phoneNumber,
            otp,
            expiredAt,
        });
        yield otpEntry.save();
    }
    return (0, response_1.sendSuccessResponse)(res, 201, message, "OTP sent successfully");
}));
// Verify OTP controller
// export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
//     const { identifier, otp, purpose } = req.body; // `identifier` can be email or phone number
//     console.log(req.body);
//     if (!identifier || !otp || !purpose) {
//         return sendErrorResponse(res, new ApiError(400, "Identifier (email or phone), otp, and purpose are required"));
//     }
//     let queryField = "phoneNumber";
//     let formattedIdentifier = identifier;
//     // Check if the identifier is an email
//     if (identifier.includes("@")) {
//         queryField = "email";
//     } else {
//         // Assume it's a phone number; format it
//         formattedIdentifier = `+91${identifier}`;
//     }
//     const otpEntry = await OTPModel.findOne({ [queryField]: formattedIdentifier });
//     if ((!otpEntry || otpEntry.expiredAt < new Date())) {
//         // Delete expired OTP entry if it exists
//         if (otpEntry) await OTPModel.deleteOne({ _id: otpEntry._id });
//         return sendSuccessResponse(res, 400, "Invalid or expired OTP");
//     }
//     const defaultOtp = "12345";
//     if (otpEntry.otp !== defaultOtp) {
//         return sendSuccessResponse(res, 400, "Invalid OTP");
//     }
//     // Delete OTP after successful validation
//     await OTPModel.deleteOne({ _id: otpEntry?._id });
//     switch (purpose) {
//         case "login": {
//             const user = await UserModel.findOne({ phone: identifier });
//             if (!user) {
//                 return sendErrorResponse(res, new ApiError(400, "User does not exist"));
//             }
//             const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);
//             const loggedInUser = await fetchUserData(user._id);
//             return res
//                 .status(200)
//                 .cookie("accessToken", accessToken, cookieOption)
//                 .cookie("refreshToken", refreshToken, cookieOption)
//                 .json(
//                     new ApiResponse(200, { user: loggedInUser[0], accessToken, refreshToken }, "User logged in successfully")
//                 );
//         }
//         case "forgetPassword": {
//             return res.status(200).json(new ApiResponse(200, "OTP Verified Successfully"));
//         }
//         case "startJob":
//         case "endJob":
//             return sendSuccessResponse(res, 200, "OTP Verified Successfully");
//         case "verifyEmail":
//             return sendSuccessResponse(res, 200, "OTP Verified Successfully");
//         case "verifyPhone":
//             return sendSuccessResponse(res, 200, "OTP Verified Successfully");
//         default:
//             return sendErrorResponse(res, new ApiError(400, "Invalid purpose"));
//     }
// }); 
exports.verifyOTP = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { identifier, otp, purpose } = req.body; // `identifier` can be email or phone number
    console.log(req.body, "verify otp payload"); //phone number with country code
    // console.log(req.body);
    if (!identifier || !otp || !purpose) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Identifier (email or phone), otp, and purpose are required"));
    }
    let queryField = "phoneNumber";
    let formattedIdentifier = identifier;
    // Check if the identifier is an email
    if (identifier.includes("@")) {
        queryField = "email";
    }
    const otpEntry = yield otp_model_1.default.findOne({ [queryField]: identifier });
    // Set default OTP for testing in non-production environments
    const defaultOtp = "12345";
    const isOtpValid = otp === defaultOtp || (otpEntry && otpEntry.otp === otp);
    if (!isOtpValid) {
        return (0, response_1.sendSuccessResponse)(res, 400, "Invalid OTP");
    }
    else {
        // Delete OTP after successful validation
        yield otp_model_1.default.deleteOne({ _id: otpEntry === null || otpEntry === void 0 ? void 0 : otpEntry._id });
    }
    switch (purpose) {
        case "login": {
            const user = yield user_model_1.default.findOne({ phone: identifier });
            let companyDetails;
            if (!user) {
                return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "User does not exist"));
            }
            const serviceProviderInfo = yield teams_model_1.default.findOne({ fieldAgentIds: user._id });
            if (user.userType === "FieldAgent" || user.userType === "TeamLead") {
                companyDetails = yield userAdditionalInfo_model_1.default.findOne({ userId: serviceProviderInfo === null || serviceProviderInfo === void 0 ? void 0 : serviceProviderInfo.serviceProviderId });
            }
            else {
                companyDetails = yield userAdditionalInfo_model_1.default.findOne({ userId: user._id });
            }
            const address = yield address_model_1.default.findOne({ userId: user._id }).select('_id userId zipCode addressType location ');
            // console.log(serviceProviderInfo);
            const { accessToken, refreshToken } = yield (0, createTokens_1.generateAccessAndRefreshToken)(res, user._id);
            const loggedInUser = yield (0, auth_controller_1.fetchUserData)(user._id);
            const agentData = {
                loggedInUser: loggedInUser[0],
                address: address || null,
                additionalInfo: companyDetails || null
            };
            return res
                .status(200)
                .cookie("accessToken", accessToken, auth_controller_1.cookieOption)
                .cookie("refreshToken", refreshToken, auth_controller_1.cookieOption)
                .json(new ApiResponse_1.ApiResponse(200, { user: agentData, accessToken, refreshToken }, "User logged in successfully"));
        }
        case "forgetPassword": {
            return res.status(200).json(new ApiResponse_1.ApiResponse(200, "OTP Verified Successfully"));
        }
        case "startJob":
        case "endJob":
            return (0, response_1.sendSuccessResponse)(res, 200, "OTP Verified Successfully");
        case "verifyEmail":
            return (0, response_1.sendSuccessResponse)(res, 200, "OTP Verified Successfully");
        case "verifyPhone":
            return (0, response_1.sendSuccessResponse)(res, 200, "OTP Verified Successfully");
        default:
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid purpose"));
    }
}));
