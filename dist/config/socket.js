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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const socketAuth_1 = require("../middlewares/auth/socketAuth");
const service_controller_1 = require("../controller/service.controller");
// Function to initialize Socket.io
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        }
    });
    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuth_1.socketAuthMiddleware);
    // Store connected customers
    const connectedCustomers = {};
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        const usertype = socket.data.userType;
        console.log(`A ${usertype} with userId ${userId} connected on socket ${socket.id}`);
        if (usertype === "Customer") {
            connectedCustomers[userId] = socket.id;
        }
        socket.on("acceptServiceRequest", (requestId) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`Service provider with _id ${userId} accepted the request ${requestId}`);
            //here the logic related with update service
            io.emit("requestInactive", requestId);
            //execute get single service request to get  associated userId
            const customerId = yield (0, service_controller_1.fetchAssociatedCustomer)(requestId);
            // Notify the customer that the service provider is on the way
            console.log(connectedCustomers);
            if (customerId && connectedCustomers[customerId]) {
                io.to(connectedCustomers[customerId]).emit("serviceProviderAccepted", {
                    message: `A service provider with userId ${userId} is on the way`,
                    requestId,
                });
            }
            ;
            // Handle service provider's location updates and send them to the customer
            socket.on("locationUpdate", (location) => __awaiter(void 0, void 0, void 0, function* () {
                if (customerId && connectedCustomers[customerId]) {
                    io.to(connectedCustomers[customerId]).emit("serviceProviderLocationUpdate", {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    });
                    console.log("Service provider location update =>");
                }
            }));
        }));
        socket.on("disconnect", () => {
            console.log(`User with socket ID ${socket.id} disconnected`);
            // Remove customer from connected list if they disconnect
            for (const customerId in connectedCustomers) {
                if (connectedCustomers[customerId] === socket.id) {
                    delete connectedCustomers[customerId];
                    console.log(`Customer ${customerId} disconnected`);
                    break;
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
