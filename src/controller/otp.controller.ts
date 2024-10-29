import twilio from 'twilio';
import OTPModel from '../models/otp.model';
import { authenticator } from "otplib";
import UserModel from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { sendErrorResponse, sendSuccessResponse } from '../utils/response';
import { ApiError } from '../utils/ApisErrors';
import { Request, Response } from "express";

authenticator.options = {
    step: 300,
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const generateOTP = (secret: string): string => {
    return authenticator.generate(secret);
};

// Send OTP controller
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, purpose } = req.body;

    let stepDuration = 4 * 60;
    if (purpose === "service") {
        stepDuration = 24 * 60 * 60;
    }
    authenticator.options = { step: stepDuration };

    const user = await UserModel.findOne({ phone: phoneNumber });
    if (!user) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    }

    const userId = user._id;
    const formattedPhoneNumber = `+91${phoneNumber}`;
    const secret = authenticator.generateSecret();
    const otp = generateOTP(secret);
    const expiredAt = new Date(Date.now() + stepDuration * 1000); // Expiry time in milliseconds

    const otpEntry = new OTPModel({
        userId,
        phoneNumber: formattedPhoneNumber,
        otp,
        expiredAt,
        secret,
    });

    await otpEntry.save();

    const message = await client.messages.create({
        body: `Your OTP code is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber,
    });

    return sendSuccessResponse(res, 201, message, "OTP sent successfully");
});

// Verify OTP controller
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return sendErrorResponse(res, new ApiError(400, "phoneNumber and otp are required"));
    }

    const formattedPhoneNumber = `+91${phoneNumber}`;

    const otpEntry = await OTPModel.findOne({ phoneNumber: formattedPhoneNumber });

    if (!otpEntry) {
        return sendErrorResponse(res, new ApiError(400, "Invalid OTP or phone number"));
    }

    const currentTime = new Date();

    if (otpEntry.expiredAt < currentTime) {
        await OTPModel.deleteOne({ _id: otpEntry._id }); 
        return sendErrorResponse(res, new ApiError(400, "OTP has expired"));
    }

    const isValid = authenticator.check(otp, otpEntry.secret);

    if (!isValid) {
        return sendErrorResponse(res, new ApiError(400, "Invalid OTP"));
    }

    await OTPModel.deleteOne({ _id: otpEntry._id });

    return sendSuccessResponse(res, 201, "OTP Verified Successfully");
});