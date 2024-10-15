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
exports.sendOTP = void 0;
const twilio_1 = __importDefault(require("twilio"));
const otp_model_1 = __importDefault(require("../models/otp.model"));
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
};
const sendOTP = (userId, to) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const otp = generateOTP();
        const expiryDuration = 5 * 60 * 1000;
        const expiredAt = new Date(Date.now() + expiryDuration);
        const otpEntry = new otp_model_1.default({
            userId: userId,
            otp: otp,
            expiredAt: expiredAt,
        });
        yield otpEntry.save();
        // Send OTP 
        const message = yield client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to,
        });
        console.log(message);
        return { message, otp };
    }
    catch (error) {
        console.error('Error sending OTP:', error);
        throw error;
    }
});
exports.sendOTP = sendOTP;
module.exports = { sendOTP: exports.sendOTP };
