import UserModel from "../models/user.model";
import { ApiError } from "../utils/ApisErrors";
import { IRegisterCredentials } from "../../types/requests_responseType";
import PermissionModel from "../models/permission.model";


export const addUser = async (userData: IRegisterCredentials) => {
    const { firstName, lastName, email, password, userType, phone } = userData;
    let permission;

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

    //adding permission
    if (savedUser && (savedUser.userType === "SuperAdmin" || savedUser.userType === "ServiceProvider")) {
        permission = {
            userId:savedUser._id,
            acceptRequest:true,
            assignJob:true,
            fieldAgentManagement:true
        }
    }else{
        permission = {
            userId:savedUser._id,
            acceptRequest:false,
            assignJob:false,
            fieldAgentManagement:false
        }
    }

    const userPermissionSet = await new PermissionModel(permission).save()
    
    return savedUser;
};
