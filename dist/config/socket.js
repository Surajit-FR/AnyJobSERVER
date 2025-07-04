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
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("../middlewares/auth/socketAuth");
const service_controller_1 = require("../controller/service.controller");
const chat_controller_1 = require("../controller/chat.controller");
const chat_model_1 = __importDefault(require("../models/chat.model"));
// Function to initialize Socket.io
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
        },
    });
    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuth_1.socketAuthMiddleware);
    // Store connected customers
    const connectedCustomers = {};
    const connectedProviders = {};
    const connectedAgent = {};
    const onlineUsers = {};
    io.on("connection", (socket) => {
        // console.log(socket.handshake.headers.accesstoken);
        const userId = socket.data.userId;
        const usertype = socket.data.userType;
        // console.log({ usertype });
        const userToken = socket.handshake.headers.accesstoken || socket.handshake.auth.accessToken;
        // console.log(`A ${usertype} with userId ${userId} connected on socket ${socket.id}`);
        if (usertype === "Customer") {
            connectedCustomers[userId] = socket.id;
        }
        else if (usertype === "ServiceProvider") {
            connectedProviders[userId] = socket.id;
            const serviceProvidersRoom = "ProvidersRoom";
            socket.join(serviceProvidersRoom);
            // console.log(`A Service Provider ${userId} joined to ${serviceProvidersRoom}`);
        }
        else {
            connectedAgent[userId] = socket.id;
        }
        socket.on("acceptServiceRequest", (requestId) => __awaiter(void 0, void 0, void 0, function* () {
            // console.log(`Service provider with _id ${userId} accepted the request ${requestId}`);
            //here the logic related with update service
            io.emit("requestInactive", requestId);
            //execute get single service request to get  associated userId
            const customerId = yield (0, service_controller_1.fetchAssociatedCustomer)(requestId);
            // Notify the customer that the service provider is on the way
            // console.log(connectedCustomers);
            if (customerId && connectedCustomers[customerId]) {
                io.to(connectedCustomers[customerId]).emit("serviceProviderAccepted", {
                    message: `A service provider with userId ${userId} is on the way`,
                    requestId,
                });
            }
            // Handle service provider's location updates and send them to the customer
            socket.on("locationUpdate", (location) => __awaiter(void 0, void 0, void 0, function* () {
                if (customerId && connectedCustomers[customerId]) {
                    io.to(connectedCustomers[customerId]).emit("serviceProviderLocationUpdate", {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    });
                    // console.log("Service provider location update =>");
                }
            }));
        }));
        // update fetch nearby service requests list when service is accepted
        socket.on("updateNearbyServices", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // console.log(`Fetching nearby service requests `);
                const date = new Date();
                // Send the event back to the client
                io.to("ProvidersRoom").emit("nearbyServicesUpdate", {
                    success: true,
                    message: "Service list is need a update",
                    date: date,
                });
            }
            catch (error) {
                socket.emit("nearbyServicesUpdate", {
                    success: false,
                    error: "Failed to fetch nearby services. Please try again.",
                });
            }
        }));
        // update fetch nearby service requests list when service is assigned
        socket.on("serviceAssigned", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // console.log(`Accepted service is assigned to field agent`);
                const date = new Date();
                // Send the event back to the client
                io.to("ProvidersRoom").emit("jobListUpdate", {
                    success: true,
                    message: "Service list is need a update",
                    date: date,
                });
            }
            catch (error) {
                socket.emit("jobListUpdate", {
                    success: false,
                    error: "Failed to assign field agent. Please try again.",
                });
            }
        }));
        // Mark user as online
        onlineUsers[userId] = true;
        io.emit("userStatusUpdate", { userId, isOnline: true });
        // Handle chat messages
        socket.on("chatMessage", (message) => __awaiter(void 0, void 0, void 0, function* () {
            const { toUserId, content } = message;
            // Validate payload
            if (!toUserId || !content) {
                return socket.emit("error", {
                    error: "Invalid payload: toUserId and content are required.",
                });
            }
            const now = new Date();
            try {
                // Identify recipient socket ID
                const recipientSocketId = connectedProviders[toUserId] ||
                    connectedCustomers[toUserId] ||
                    connectedAgent[toUserId];
                let isRead = false;
                if (recipientSocketId) {
                    // Recipient is online and will see the message now
                    isRead = true;
                }
                // Save the chat message in the database
                yield (0, chat_controller_1.saveChatMessage)({
                    fromUserId: userId,
                    toUserId,
                    content,
                    isRead,
                    timestamp: now,
                });
                // Update chat lists for both users
                yield (0, chat_controller_1.updateChatList)(userId, toUserId, content, now);
                yield (0, chat_controller_1.updateChatList)(toUserId, userId, content, now);
                if (recipientSocketId) {
                    console.log("Sending message to:", toUserId, "Socket ID:", recipientSocketId);
                    io.to(recipientSocketId).emit("chatMessage", {
                        fromUserId: userId,
                        content,
                        timestamp: now,
                    });
                    io.to(recipientSocketId).emit("chatNotification", {
                        fromUserId: userId,
                        content,
                        timestamp: now,
                    });
                }
            }
            catch (error) {
                console.error("Error handling chatMessage:", error);
                socket.emit("error", {
                    error: "Failed to send message. Please try again.",
                });
            }
        }));
        // When a user opens a chat (marks messages as read)
        socket.on("markMessagesRead", (_a) => __awaiter(void 0, [_a], void 0, function* ({ toUserId }) {
            try {
                yield chat_model_1.default.updateMany({ toUserId, isRead: false }, { $set: { isRead: true } });
                console.log(`Marked messages as read for conversation: ${userId} `);
            }
            catch (error) {
                console.error("Error marking messages as read:", error);
            }
        }));
        socket.on("disconnect", () => {
            // Mark user as offline
            const userId = socket.data.userId;
            if (userId) {
                onlineUsers[userId] = false;
                io.emit("userStatusUpdate", { userId, isOnline: false }); //Notify others about offline status
            }
            // Remove user from connected lists
            for (const customerId in connectedCustomers) {
                if (connectedCustomers[customerId] === socket.id) {
                    delete connectedCustomers[customerId];
                    // console.log(`Customer ${customerId} disconnected`);
                    break;
                }
            }
            for (const providerId in connectedProviders) {
                if (connectedProviders[providerId] === socket.id) {
                    delete connectedProviders[providerId];
                    // console.log(`ServiceProvider ${providerId} disconnected`);
                    break;
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
