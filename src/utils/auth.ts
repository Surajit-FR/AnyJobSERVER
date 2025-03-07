import UserModel from "../models/user.model";
import { ApiError } from "../utils/ApisErrors";
import { IRegisterCredentials } from "../../types/requests_responseType";
import PermissionModel from "../models/permission.model";
import { sendMail } from "./sendMail";
import { fetchUserData } from "../controller/auth/auth.controller";
import { Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { sendErrorResponse } from "./response";
import cardValidator from 'card-validator';
import UserPreferenceModel from "../models/userPreference.model";
import mongoose from "mongoose";



export const generateRandomPassword = (length = 10): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};


export const addUser = async (userData: IRegisterCredentials) => {

    const { firstName, lastName, email, userType, phone, avatar } = userData;

    let password = userData.password; // Default to provided password
    let permission, generatedPass;
    if (phone) {
        const existingPhone = await UserModel.findOne({ phone });
        if (existingPhone) {
            // console.log(existingPhone);
            throw new ApiError(409, "User with phone already exists");
        }
    }
    
    if (email) {
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
            throw new ApiError(409, "User with email already exists");
        }
    }

    if (!password || (email && phone)) {
        password = generateRandomPassword();
    }
    generatedPass = password;
    // Generate a random password
    // password = generateRandomPassword();
    // generatedPass = password;

    // Create the new user
    const newUser = await UserModel.create({
        firstName,
        lastName,
        email,
        password,
        rawPassword: password,        
        userType,
        phone,
        avatar
    });

    // console.log(newUser,"user signup data afetr db operation");


    const fetchUser = await fetchUserData(newUser._id);
    const savedUser = fetchUser[0];

    // Adding permissions based on userType
    if (savedUser && (savedUser.userType === "SuperAdmin" || savedUser.userType === "ServiceProvider")) {
        permission = {
            userId: savedUser._id,
            acceptRequest: true,
            assignJob: true,
            fieldAgentManagement: true,
        };
    } else {
        permission = {
            userId: savedUser._id,
            acceptRequest: false,
            assignJob: false,
            fieldAgentManagement: false,
        };
    }

    const userPermissionSet = await new PermissionModel(permission).save();

    if (savedUser.userType !== "SuperAdmin") {
        const UserPreference = {
            userId: savedUser._id,
            userType: savedUser.userType,
            notificationPreference: true
        }
        const UserPreferenceSet = await new UserPreferenceModel(UserPreference).save();

    }


    //temporary disable due to no credentials
    if (userType === "FieldAgent" || userType === "Admin" || userType === "Finance") {
        const to = savedUser.email;
        const subject = "Welcome to Any Job - Your Login Credentials";
        const html = `Dear ${savedUser.firstName} ${savedUser.lastName}, your login credentials for AnyJob are: <b>Password: ${generatedPass}</b> or you can directly log in using your registered <b>Phone Number: ${savedUser.phone}</b>.`;
        await sendMail(to, subject, html);
    }

    return savedUser;
};

export const CheckJWTTokenExpiration = async (req: Request, res: Response) => {
    try {
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            console.log("Token is missing or empty");
            return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
        }

        const decoded = jwt.decode(token) as JwtPayload | null;


        if (!decoded || !decoded.exp) {
            return sendErrorResponse(res, new ApiError(400, "Invalid token or missing expiration"));
        }

        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const remainingTimeInSeconds = decoded.exp - currentTime;

        // console.log(currentTime);
        if (remainingTimeInSeconds <= 0) {
            return res.status(200).json({ isExpired: true, remainingTimeInSeconds: 0 });
        }

        return res.status(200).json({ isExpired: false, remainingTimeInSeconds });
    } catch (error: any) {
        console.error("Error checking token expiration:", error.message);
        return sendErrorResponse(res, new ApiError(500, "Internal Server Error"));
    }
};


export function getCardType(cardNumber: string): string {
    const cardInfo = cardValidator.number(cardNumber);

    if (cardInfo.isPotentiallyValid && cardInfo.card) {
        return cardInfo.card.type; // Returns card type like 'visa', 'mastercard', etc.
    }
    return 'Unknown';
}

const cardNumber = "4111111111111111";
// console.log(`Card Type: ${getCardType(cardNumber)}`);

export async function isNotificationPreferenceOn(userId: string) {
    let isOn

    const result = await UserPreferenceModel.findOne(
        { userId: new mongoose.Types.ObjectId(userId) }
    ).select('notificationPreference');

    isOn = result?.notificationPreference;
    return isOn;
};


