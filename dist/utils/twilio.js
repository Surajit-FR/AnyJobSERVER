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
exports.sendSMS = void 0;
const twilio_1 = __importDefault(require("twilio"));
// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
// General function to send SMS
const sendSMS = (phoneNumber, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!phoneNumber || !message) {
            throw new Error("Phone number and message are required");
        }
        const smsResponse = yield client.messages.create({
            body: message,
            to: phoneNumber, // Receiver's phone number
            from: process.env.TWILIO_PHONE_NUMBER // Your Twilio number
        });
        console.log(`SMS sent to ${phoneNumber}: ${smsResponse.sid}`);
        return {
            success: true,
            sid: smsResponse.sid,
            message: `SMS sent successfully to ${phoneNumber}`,
        };
    }
    catch (error) {
        console.error(`Failed to send SMS: ${error.message}`);
        return {
            success: false,
            message: `Failed to send SMS to ${phoneNumber}`,
            error: error.message
        };
    }
});
exports.sendSMS = sendSMS;
