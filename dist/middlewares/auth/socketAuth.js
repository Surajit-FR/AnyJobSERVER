"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Middleware function to verify JWT token for socket connections
const socketAuthMiddleware = (socket, next) => {
    const JWT_SECRET = process.env.REFRESH_TOKEN_SECRET;
    console.log({ JWT_SECRET });
    const token = socket.handshake.headers.accesstoken;
    if (!token) {
        // If no token is provided, block the connection
        return next(new Error("Authentication error: No token provided"));
    }
    // Verify the token
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // console.log({ JWT_SECRET });
            // If token is invalid or expired, reject the connection
            return next(new Error("Authentication error: Invalid token"));
        }
        // Attach the decoded user information (e.g., userId) to the socket object
        socket.data.userId = decoded._id; // Store _id in socket's data object for future use
        console.log(socket.data.userId);
        next(); // Allow the connection to proceed
    });
};
exports.socketAuthMiddleware = socketAuthMiddleware;
