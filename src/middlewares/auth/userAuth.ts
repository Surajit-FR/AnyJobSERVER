import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApisErrors';
import { sendErrorResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import UserModel from '../../models/user.model';
import { CustomRequest } from '../../../types/commonType';

// VerifyToken
export const VerifyJWTToken = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        // Log the cookies and headers for debugging
        // console.log("Cookies:", req.cookies);
        // console.log("Authorization Header:", req.header("Authorization"));
        // console.log("Extracted Token:", token);

        if (!token) { // This checks for both null and empty string
            console.log("Token is missing or empty");
            return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
        };

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
        const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return sendErrorResponse(res, new ApiError(401, "Invalid access token"));
        };
        req.user = user;

        next();
    } catch (error: any) {
        return sendErrorResponse(res, new ApiError(401, error.message || "Invalid access token"));
    }
});

export const VerifySuperAdminJWTToken = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            console.log("Token is missing or empty");
            return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
        };

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
        const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return sendErrorResponse(res, new ApiError(401, "Invalid access token"));
        };

        // Check if user is SuperAdmin
        if (user.userType !== "SuperAdmin") {
            return sendErrorResponse(res, new ApiError(403, "Access denied. SuperAdmin rights required."));
        }

        // Attach user data to the request
        req.user = user;

        // Proceed to the next middleware or route
        next();
    } catch (error: any) {
        return sendErrorResponse(res, new ApiError(401, error.message || "Invalid access token"));
    }
});



