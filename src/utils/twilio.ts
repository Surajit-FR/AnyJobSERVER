import twilio from "twilio";

interface SmsResponse {
    success: boolean;
    sid?: string;
    message: string;
    error?: string;}


// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client =  twilio(accountSid, authToken);

// General function to send SMS
export const sendSMS = async (phoneNumber: string, message: string): Promise<SmsResponse> => {
    try {
        if (!phoneNumber || !message) {
            throw new Error("Phone number and message are required");
        }

        const smsResponse = await client.messages.create({
            body: message,
            to: phoneNumber,    // Receiver's phone number
            from: process.env.TWILIO_PHONE_NUMBER as string  // Your Twilio number
        });

        console.log(`SMS sent to ${phoneNumber}: ${smsResponse.sid}`);
        return {
            success: true,
            sid: smsResponse.sid,
            message: `SMS sent successfully to ${phoneNumber}`,
        };
    } catch (error: any) {
        console.error(`Failed to send SMS: ${error.message}`);
        return {
            success: false,
            message: `Failed to send SMS to ${phoneNumber}`,
            error: error.message
        };
    }
};


