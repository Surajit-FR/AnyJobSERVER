import UserModel from "../models/user.model";
import { ApiError } from "../utils/ApisErrors";
import { IRegisterCredentials } from "../../types/requests_responseType";

export const addUser = async (userData: IRegisterCredentials) => {
    const { firstName, lastName, email, password, userType, phone } = userData;

    // Check for duplicate user
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "User with email already exists");
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
    return savedUser;
};
