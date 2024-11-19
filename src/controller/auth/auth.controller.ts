import { Request, Response } from "express";
import UserModel from "../../models/user.model";
import { ApiError } from "../../utils/ApisErrors";
import { addUser } from "../../utils/auth";
import { IRegisterCredentials } from "../../../types/requests_responseType";
import { sendErrorResponse } from "../../utils/response";
import { generateAccessAndRefreshToken } from "../../utils/createTokens";
import { CustomRequest } from "../../../types/commonType";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { IUser } from "../../../types/schemaTypes";
import { GoogleAuth } from "../../utils/socialAuth"
import jwt, { JwtPayload } from 'jsonwebtoken';
import TeamModel from '../../models/teams.model';
import { ObjectId } from "mongoose";
import PermissionModel from "../../models/permission.model";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendMail } from "../../utils/sendMail";


// fetchUserData func.
const fetchUserData = async (userId: string | ObjectId) => {
    const user = await UserModel.aggregate([
        {
            $match: {
                isDeleted: false,
                _id: userId
            }
        },
        {
            $lookup: {
                from: "permissions",
                foreignField: "userId",
                localField: "_id",
                as: "permission"
            }
        },
        {
            $unwind: {
                preserveNullAndEmptyArrays: true,
                path: "$permission"
            }
        },
        {
            $project: {
                'permission.userId': 0,
                'permission.isDeleted': 0,
                'permission.createdAt': 0,
                'permission.updatedAt': 0,
                'permission.__v': 0,
                password: 0,
                refreshToken: 0
            }
        }
    ]);
    return user;
};

// Set cookieOption
const cookieOption: { httpOnly: boolean, secure: boolean, maxAge: number, sameSite: 'lax' | 'strict' | 'none' } = {
    httpOnly: true,
    secure: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 Day
    sameSite: 'strict'
};

// addAssociate controller
export const addAssociate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userData: IRegisterCredentials = req.body;
    const userType = req.user?.userType;
    const userId = req.user?._id;
    let serviceProviderId = userId;

    if (userType === "TeamLead") {

        const permissions = await PermissionModel.findOne({ userId }).select('fieldAgentManagement');
        if (!permissions?.fieldAgentManagement) {
            return sendErrorResponse(res, new ApiError(403, 'Permission denied: Field Agent Management not granted.'));
        }

        const team = await TeamModel.findOne({ isDeleted: false, fieldAgentIds: userId }).select('serviceProviderId');
        if (!team || !team.serviceProviderId) {
            return sendErrorResponse(res, new ApiError(404, 'Service Provider ID not found in team.'));
        }

        serviceProviderId = team.serviceProviderId;
    }

    const savedAgent = await addUser(userData);
    if (userData.userType === "FieldAgent") {
        const team = await TeamModel.findOneAndUpdate(
            { serviceProviderId },
            { $push: { fieldAgentIds: savedAgent._id } },
            { new: true, upsert: true }
        );

        if (!team) {
            return sendErrorResponse(res, new ApiError(400, "Service Provider team not found."));
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, savedAgent._id);

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json({
            statusCode: 200,
            data: {
                user: savedAgent,
                accessToken,
                refreshToken
            },
            message: `${userData.userType} added successfully.`,
            success: true
        });
});

// register user controller
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const userData: IRegisterCredentials = req.body;

    const savedUser = await addUser(userData);

    if (userData.userType === 'ServiceProvider') {
        const newTeam = new TeamModel({
            serviceProviderId: savedUser._id,
            fieldAgents: []
        });
        const savedTeam = await newTeam.save();
        if (!savedTeam) {
            return sendErrorResponse(res, new ApiError(400, "ServiceProvider team not created"));
        }
    }
    const newUser = await fetchUserData(savedUser._id)
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, savedUser._id);

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json({
            statusCode: 200,
            data: {
                user: newUser[0],
                accessToken,
                refreshToken
            },
            message: "User Registered Successfully",
            success: true
        });
});

// login user controller
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, isAdminPanel }: IUser & { isAdminPanel?: boolean } = req.body;

    if (!email) {
        return sendErrorResponse(res, new ApiError(400, "Email is required"));
    };

    const user = await UserModel.findOne({ email });

    if (!user) {
        return sendErrorResponse(res, new ApiError(400, "User does not exist"));
    };

    const userId = user._id;

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return sendErrorResponse(res, new ApiError(403, "Invalid user credentials"));
    };

    if (user.isDeleted) {
        return sendErrorResponse(res, new ApiError(403, "Your account is banned from a AnyJob."));
    };

    // Check for admin panel access
    if (isAdminPanel) {
        if (user.userType !== 'SuperAdmin') {
            return sendErrorResponse(res, new ApiError(403, "Access denied. Only SuperAdmins can log in to the admin panel."));
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);
    const loggedInUser = await fetchUserData(user._id)

    if (user.userType === "ServiceProvider" && !user.isVerified) {
        return sendErrorResponse(res, new ApiError(403, "Your account verification is under process. Please wait for confirmation.", [], userId));
    };

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOption)
        .cookie("refreshToken", refreshToken, cookieOption)
        .json
        (
            new ApiResponse
                (
                    200,
                    { user: loggedInUser[0], accessToken, refreshToken },
                    "User logged In successfully"
                )
        );
});

// logout user controller
export const logoutUser = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user || !req.user?._id) {
        return sendErrorResponse(res, new ApiError(400, "User not found in request"));
    };

    const userId = req.user?._id;

    await UserModel.findByIdAndUpdate(
        userId,
        {
            $set: { refreshToken: "" }
        },
        { new: true }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
    };

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// refreshAccessToken controller
export const refreshAccessToken = asyncHandler(async (req: CustomRequest, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        return sendErrorResponse(res, new ApiError(401, "Unauthorized request"));
    };

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload;
        const user = await UserModel.findById(decodedToken?._id);

        if (!user) {
            return sendErrorResponse(res, new ApiError(401, "Invalid refresh token"));
        };

        if (user?.refreshToken !== incomingRefreshToken) {
            return sendErrorResponse(res, new ApiError(401, "Refresh token is expired or used"));
        };

        const cookieOption: { httpOnly: boolean, secure: boolean } = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(res, user._id);

        return res.status(200)
            .cookie("accessToken", accessToken, cookieOption)
            .cookie("refreshToken", refreshToken, cookieOption)
            .json
            (
                new ApiResponse
                    (
                        200,
                        { accessToken, refreshToken },
                        "Access token refreshed"
                    )
            );
    } catch (exc: any) {
        return sendErrorResponse(res, new ApiError(401, exc.message || "Invalid refresh token"));
    };
});

// Auth user (Social)
export const AuthUserSocial = asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
        // Check if user object is already attached by the middleware
        let user: any = req.user;

        // If user object is not attached, it means user needs to be fetched from req.body
        if (!user) {
            const { email, uid, displayName, photoURL, phoneNumber, providerId, userType } = req.body;

            // Check if user already exists in the database
            user = await UserModel.findOne({ email: email });

            if (!user) {
                // If user doesn't exist, create a new one
                if (providerId === "google.com") {
                    user = await GoogleAuth(email, uid, displayName, photoURL, phoneNumber, userType);
                } else if (providerId === "facebook.com") {
                    return res.status(400).json({ success: false, message: "Facebook login is not supported yet" });
                }

                // Handle error while creating user
                if (user.err) {
                    return res.status(500).json({ success: false, message: user.message, error: user.err });
                }
            }
        }

        // Continue with login logic
        const USER_DATA = { ...user._doc };
        const tokenData = generateAccessAndRefreshToken(res, USER_DATA._id);

        // Format the response as per the provided JSON structure
        return res.status(200).json({
            statusCode: 200,
            data: {
                user: {
                    _id: USER_DATA._id,
                    firstName: USER_DATA.firstName,
                    lastName: USER_DATA.lastName,
                    email: USER_DATA.email,
                    avatar: USER_DATA.avatar, // Add avatar if it's in USER_DATA
                    userType: USER_DATA.userType, // Ensure this is available in USER_DATA
                    isDeleted: false, // You might want to set this dynamically based on your logic
                    createdAt: USER_DATA.createdAt, // Ensure this is available in USER_DATA
                    updatedAt: USER_DATA.updatedAt, // Ensure this is available in USER_DATA
                    __v: USER_DATA.__v, // Ensure this is available in USER_DATA
                },
                accessToken: (await tokenData).accessToken, // Assuming tokenData returns accessToken
                refreshToken: (await tokenData).refreshToken, // Assuming tokenData returns refreshToken
            },
            message: "User logged In successfully",
            success: true,

        });

    } catch (exc: any) {
        console.log(exc.message);
        return res.status(500).json({ success: false, message: "Internal server error", error: exc.message });
    }
});



export const resetPassword = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?._id;


    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    };

    const userDetails = await UserModel.findById(userId);

    if (!userDetails) {
        return res.status(404).json({ message: 'User not found.' });
    };

    // Update the password
    userDetails.password = req.body.password;

    await userDetails.save();

    res.status(200).json({ message: 'Password reset Successfull.' });
});