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
exports.verifyUserType = exports.VerifyJWTToken = void 0;
const ApisErrors_1 = require("../../utils/ApisErrors");
const response_1 = require("../../utils/response");
const asyncHandler_1 = require("../../utils/asyncHandler");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../../models/user.model"));
// VerifyToken
exports.VerifyJWTToken = (0, asyncHandler_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken) || ((_b = req.header("Authorization")) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", ""));
        // Log the cookies and headers for debugging
        // console.log("Cookies:", req.cookies);
        // console.log("Authorization Header:", req.header("Authorization"));
        // console.log("Extracted Token:", token);
        if (!token) { // This checks for both null and empty string
            console.log("Token is missing or empty");
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Unauthorized Request"));
        }
        ;
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = yield user_model_1.default.findById(decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken._id).select("-password -refreshToken");
        if (!user) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Invalid access token"));
        }
        ;
        req.user = user;
        next();
    }
    catch (error) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, error.message || "Invalid access token"));
    }
}));
// export const VerifySuperAdminJWTToken = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
//     try {
//         let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
//         if (!token) {
//             console.log("Token is missing or empty");
//             return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
//         };
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
//         const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");
//         if (!user) {
//             return sendErrorResponse(res, new ApiError(401, "Invalid access token"));
//         };
//         // Check if user is SuperAdmin
//         if (user.userType !== "SuperAdmin") {
//             return sendErrorResponse(res, new ApiError(403, "Access denied. SuperAdmin rights required."));
//         }
//         // Attach user data to the request
//         req.user = user;
//         // Proceed to the next middleware or route
//         next();
//     } catch (error: any) {
//         return sendErrorResponse(res, new ApiError(401, error.message || "Invalid access token"));
//     }
// });
// export const VerifyServiceProviderJWTToken = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
//     try {
//         let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
//         if (!token) {
//             console.log("Token is missing or empty");
//             return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
//         };
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
//         const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");
//         if (!user) {
//             return sendErrorResponse(res, new ApiError(401, "Invalid access token"));
//         };
//         // Check if user is SuperAdmin
//         if (user.userType !== "ServiceProvider") {
//             return sendErrorResponse(res, new ApiError(403, "Access denied. ServiceProvider rights required."));
//         }
//         // Attach user data to the request
//         req.user = user;
//         // Proceed to the next middleware or route
//         next();
//     } catch (error: any) {
//         return sendErrorResponse(res, new ApiError(401, error.message || "Invalid access token"));
//     }
// });
// export const VerifyCustomerJWTToken = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
//     try {
//         let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
//         if (!token) {
//             console.log("Token is missing or empty");
//             return sendErrorResponse(res, new ApiError(401, "Unauthorized Request"));
//         };
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
//         const user = await UserModel.findById(decodedToken?._id).select("-password -refreshToken");
//         if (!user) {
//             return sendErrorResponse(res, new ApiError(401, "Invalid access token"));
//         };
//         // Check if user is SuperAdmin
//         if (user.userType !== "Customer") {
//             return sendErrorResponse(res, new ApiError(403, "Access denied. Customer rights required."));
//         }
//         // Attach user data to the request
//         req.user = user;
//         // Proceed to the next middleware or route
//         next();
//     } catch (error: any) {
//         return sendErrorResponse(res, new ApiError(401, error.message || "Invalid access token"));
//     }
// });
const verifyUserType = (requiredUserTypes = null) => {
    return (0, asyncHandler_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.user) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Unauthorized Request"));
        }
        if (requiredUserTypes && !requiredUserTypes.includes(req.user.userType)) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(403, `Access denied. Requires one of the following roles: ${requiredUserTypes.join(", ")}.`));
        }
        next();
    }));
};
exports.verifyUserType = verifyUserType;
