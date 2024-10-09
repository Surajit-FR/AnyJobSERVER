import twilio from 'twilio';
import OTPModel from '../models/otp.model';
import { ObjectId } from 'mongoose';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
};

export const sendOTP = async (userId: any, to: any) => {
    try {
        const otp = generateOTP();
        const expiryDuration = 5 * 60 * 1000;
        const expiredAt = new Date(Date.now() + expiryDuration);

        const otpEntry = new OTPModel({
            userId: userId,
            otp: otp,
            expiredAt: expiredAt,
        });

        await otpEntry.save();

        // Send OTP 
        const message = await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });
        console.log(message);
        
        return { message, otp };
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw error;
    }
};

module.exports = { sendOTP };