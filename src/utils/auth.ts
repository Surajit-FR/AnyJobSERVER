import UserModel from "../models/user.model";
import { ApiError } from "../utils/ApisErrors";
import { IRegisterCredentials } from "../../types/requests_responseType";
import PermissionModel from "../models/permission.model";
import { sendMail } from "./sendMail";

export const generateRandomPassword = (length = 10): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};


export const addUser = async (userData: IRegisterCredentials) => {
    const { firstName, lastName, email, userType, phone } = userData;
    let password = userData.password; // Default to provided password
    let permission, generatedPass;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "User with email already exists");
    }

    // Generate a random password only for FieldAgent 
    if (userType === "FieldAgent") {
        password = generateRandomPassword();
        generatedPass = password;
        console.log({ password });

    }

    // Create the new user
    const newUser = new UserModel({
        firstName,
        lastName,
        email,
        password,
        userType,
        phone,
    });

    const savedUser = await newUser.save();

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

    if (userType === "FieldAgent") {
        const to = savedUser.email;
        const subject = "Welcome to Any Job - Your Login Credentials";
        const html = `Dear ${savedUser.firstName} ${savedUser.lastName}, your login credentials for AnyJob are: <b>Password: ${generatedPass}</b> or you can directly log in using your registered <b>Phone Number: ${savedUser.phone}</b>.`;
        await sendMail(to, subject, html);
    }

    return savedUser;
};
