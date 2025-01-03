import twilio from 'twilio';
import OTPModel from '../models/otp.model';
import { authenticator } from "otplib";
import UserModel from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { sendErrorResponse, sendSuccessResponse } from '../utils/response';
import { ApiError } from '../utils/ApisErrors';
import { Request, Response } from "express";
import { generateAccessAndRefreshToken } from '../utils/createTokens';
import { fetchUserData, cookieOption } from './auth/auth.controller';
import { ApiResponse } from '../utils/ApiResponse';

authenticator.options = {
    step: 300,
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


export const generateVerificationCode = (length: number): number => {
    if (length <= 0) {
        throw new Error("Length must be greater than 0");
    }
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1));
};

//send otp
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, purpose } = req.body;

    let stepDuration = 4 * 60; 
    if (purpose === "service") {
        stepDuration = 24 * 60 * 60; 
    }

    const user = await UserModel.findOne({ phone: phoneNumber });
    if (!user) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    }

    const userId = user._id;
    const formattedPhoneNumber = `+91${phoneNumber}`;
    const otpLength = 5;
    const otp = generateVerificationCode(otpLength);
    const expiredAt = new Date(Date.now() + stepDuration * 1000);

    const otpEntry = new OTPModel({
        userId,
        phoneNumber: formattedPhoneNumber,
        otp,
        expiredAt,
    });

    await otpEntry.save();
      // const message = "Testing"

    const message = await client.messages.create({
        body: `Your OTP code is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber,
    });

    return sendSuccessResponse(res, 201, message, "OTP sent successfully");
});


// Verify OTP controller
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp, purpose } = req.body; // `identifier` can be email or phone number

    if (!identifier || !otp || !purpose) {
        return sendErrorResponse(res, new ApiError(400, "Identifier (email or phone), otp, and purpose are required"));
    }

    let queryField = "phoneNumber";
    let formattedIdentifier = identifier;

    // Check if the identifier is an email
    if (identifier.includes("@")) {
        queryField = "email";
    } else {
        // Assume it's a phone number; format it
        formattedIdentifier = `+91${identifier}`;
    }

    const otpEntry = await OTPModel.findOne({ [queryField]: formattedIdentifier });

    if (!otpEntry || otpEntry.expiredAt < new Date()) {
        // Delete expired OTP entry if it exists
        if (otpEntry) await OTPModel.deleteOne({ _id: otpEntry._id });
        return sendErrorResponse(res, new ApiError(400, "Invalid or expired OTP"));
    }

    if (otpEntry.otp !== otp) {
        return sendErrorResponse(res, new ApiError(400, "Invalid OTP"));
    }

    // Delete OTP after successful validation
    await OTPModel.deleteOne({ _id: otpEntry._id });

    switch (purpose) {
        case "login": {
            const user = await UserModel.findOne({ [queryField]: identifier });
            if (!user) {
                return sendErrorResponse(res, new ApiError(400, "User does not exist"));
            }

            const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);
            const loggedInUser = await fetchUserData(user._id);

            return res
                .status(200)
                .cookie("accessToken", accessToken, cookieOption)
                .cookie("refreshToken", refreshToken, cookieOption)
                .json(
                    new ApiResponse(200, { user: loggedInUser[0], accessToken, refreshToken }, "User logged in successfully")
                );
        }

        case "forgetPassword":{
            const user = await UserModel.findOne({ [queryField]: identifier });
            if (!user) {
                return sendErrorResponse(res, new ApiError(400, "User does not exist"));
            }

            const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);
            const loggedInUser = await fetchUserData(user._id);

            return res
                .status(200)
                .cookie("accessToken", accessToken, cookieOption)
                .cookie("refreshToken", refreshToken, cookieOption)
                .json(
                    new ApiResponse(200, "OTP Verified Successfully")
                );
        }
        case "startJob":
        case "endJob":
            return sendSuccessResponse(res, 200, "OTP Verified Successfully");

        default:
            return sendErrorResponse(res, new ApiError(400, "Invalid purpose"));
    }
});


