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
exports.socketAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../../models/user.model"));
// Middleware function to verify JWT token for socket connections
const socketAuthMiddleware = (socket, next) => {
    const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;
    const token = socket.handshake.headers.accesstoken || socket.handshake.auth.accessToken;
    // console.log(token);
    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }
    // Verify the token
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
        const connectedUser = yield user_model_1.default.findById(decoded._id).select("-password -refreshToken");
        if (!connectedUser) {
            return next(new Error("Authentication error: User not found"));
        }
        socket.data.userId = connectedUser._id;
        socket.data.userType = connectedUser.userType;
        next();
    }));
};
exports.socketAuthMiddleware = socketAuthMiddleware;
