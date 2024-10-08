"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("../middlewares/auth/socketAuth");
// Function to initialize Socket.io
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        }
    });
    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuth_1.socketAuthMiddleware);
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        console.log("socket=>", socket.handshake);
        console.log(`Service provider with userId ${userId} connected on socket ${socket.id}`);
        socket.on("acceptServiceRequest", (requestId) => {
            console.log(`Service provider with _id ${userId} accepted the request ${requestId}`);
            //here the logic related with update service
            io.emit("requestInactive", requestId);
        });
        socket.on("disconnect", () => {
            console.log(`Service provider with _id ${userId} disconnected`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
