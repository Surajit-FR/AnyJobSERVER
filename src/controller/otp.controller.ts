import twilio from 'twilio';
import OTPModel from '../models/otp.model';
import UserModel from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { sendErrorResponse, sendSuccessResponse } from '../utils/response';
import { ApiError } from '../utils/ApisErrors';
import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const generateOTP = () => {
    const otp = uuidv4().slice(0, 6); // Generates a 6-digit OTP
    // console.log({otp});    
    return otp
};

export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;

    const user = await UserModel.findOne({ phone: phoneNumber });

    if (!user) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    }

    const userId = user._id;

    const otp = generateOTP();
    const expiryDuration = 5 * 60 * 1000; // 5 minutes
    const expiredAt = new Date(Date.now() + expiryDuration);
    const formattedPhoneNumber = `+91${phoneNumber}`;

    const otpEntry = new OTPModel({
        userId: userId,
        phoneNumber: formattedPhoneNumber,
        otp: otp,
        expiredAt: expiredAt,
    });

    await otpEntry.save();


    const message = await client.messages.create({
        body: `Your OTP code is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber,
    });

    // console.log('OTP sent:', message);

    return sendSuccessResponse(res, 201, message, "OTP sent successfully");
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return sendErrorResponse(res, new ApiError(400, "phoneNumber and otp are required"));
    }
    const formattedPhoneNumber = `+91${phoneNumber}`;

    const otpEntry = await OTPModel.findOne({ phoneNumber: formattedPhoneNumber, otp: otp });

    if (!otpEntry) {
        return sendErrorResponse(res, new ApiError(400, "Invalid OTP or phone number"));
    }

    const currentTime = new Date();
    if (otpEntry.expiredAt < currentTime) {
        await OTPModel.deleteOne({ _id: otpEntry._id });
        return sendErrorResponse(res, new ApiError(400, "OTP has expired"));
    }

    await OTPModel.deleteOne({ _id: otpEntry._id });

    return sendSuccessResponse(res, 201, "OTP Verified Successfully");
});
