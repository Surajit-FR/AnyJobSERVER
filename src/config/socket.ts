import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { socketAuthMiddleware } from "../middlewares/auth/socketAuth";
import { handleServiceRequestState, fetchAssociatedCustomer } from "../controller/service.controller";
import { saveChatMessage, updateChatList } from "../controller/chat.controller";
import { emit } from "process";
import axios from "axios";



// Function to initialize Socket.io
export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
        }
    });

    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuthMiddleware);

    // Store connected customers
    const connectedCustomers: { [key: string]: string } = {};
    const connectedProviders: { [key: string]: string } = {};
    const onlineUsers: { [userId: string]: boolean } = {};


    io.on("connection", (socket: Socket) => {
        // console.log(socket.handshake.headers.accesstoken);


        const userId = socket.data.userId;
        const usertype = socket.data.userType;
        // console.log({ usertype });

        const userToken = socket.handshake.headers.accesstoken || socket.handshake.auth.accessToken;
        console.log(`A ${usertype} with userId ${userId} connected on socket ${socket.id}`);

        if (usertype === "Customer") {
            connectedCustomers[userId] = socket.id;
        } else if (usertype === "ServiceProvider") {
            connectedProviders[userId] = socket.id;
            const serviceProvidersRoom = "ProvidersRoom";
            socket.join(serviceProvidersRoom);
            console.log(`A Service Provider ${userId} joined to ${serviceProvidersRoom}`);
        }



        socket.on("acceptServiceRequest", async (requestId: string) => {
            console.log(`Service provider with _id ${userId} accepted the request ${requestId}`);
            //here the logic related with update service
            io.emit("requestInactive", requestId);

            //execute get single service request to get  associated userId
            const customerId = await fetchAssociatedCustomer(requestId);






            // Notify the customer that the service provider is on the way
            console.log(connectedCustomers);
            if (customerId && connectedCustomers[customerId]) {
                io.to(connectedCustomers[customerId]).emit("serviceProviderAccepted", {
                    message: `A service provider with userId ${userId} is on the way`,
                    requestId,
                });
            };

            // Handle service provider's location updates and send them to the customer
            socket.on("locationUpdate", async (location: { latitude: number; longitude: number }) => {

                if (customerId && connectedCustomers[customerId]) {
                    io.to(connectedCustomers[customerId]).emit("serviceProviderLocationUpdate", {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    });
                    console.log("Service provider location update =>");

                }
            });
        });


        // update fetch nearby service requests list when service is accepted
        socket.on("updateNearbyServices", async () => {
            try {
                console.log(`Fetching nearby service requests `);
                const date = new Date();

                // Send the event back to the client
                io.to('ProvidersRoom').emit("nearbyServicesUpdate", {
                    success: true,
                    message: "Service list is need a update",
                    date: date
                });
            } catch (error) {
                socket.emit("nearbyServicesUpdate", {
                    success: false,
                    error: "Failed to fetch nearby services. Please try again.",
                });
            }
        });

        // update fetch nearby service requests list when service is assigned
        socket.on("serviceAssigned", async () => {
            try {
                console.log(`Accepted service is assigned to field agent`);
                const date = new Date();

                // Send the event back to the client
                io.to('ProvidersRoom').emit("jobListUpdate", {
                    success: true,
                    message: "Service list is need a update",
                    date: date
                });
            } catch (error) {
                socket.emit("jobListUpdate", {
                    success: false,
                    error: "Failed to assign field agent. Please try again.",
                });
            }
        });


        // Mark user as online
        onlineUsers[userId] = true;
        io.emit("userStatusUpdate", { userId, isOnline: true }); // Notify others about online status

        // Handle chat messages
        socket.on("chatMessage", async (message: { toUserId: string; content: string }) => {
            const { toUserId, content } = message;
        
            // Validate payload
            if (!toUserId || !content) {
                return socket.emit("error", {
                    error: "Invalid payload: toUserId and content are required.",
                });
            }
        
            const now = new Date();
        
            try {
                // Save the chat message in the database
                await saveChatMessage({
                    fromUserId: userId,
                    toUserId,
                    content,
                    timestamp: now,
                });
        
                // Update chat lists for both users
                await updateChatList(userId, toUserId, content, now);
                await updateChatList(toUserId, userId, content, now);
        
                // Identify recipient socket ID
                const recipientSocketId =
                    connectedProviders[toUserId] || connectedCustomers[toUserId];
        
                if (recipientSocketId) {
                    console.log("Sending message to:", toUserId, "Socket ID:", recipientSocketId);
        
                    io.to(recipientSocketId).emit("chatMessage", {
                        fromUserId: userId,
                        content,
                        timestamp: now,
                    });
                } else {
                    console.log("Recipient is not connected:", toUserId);
                }
            } catch (error) {
                console.error("Error handling chatMessage:", error);
                socket.emit("error", {
                    error: "Failed to send message. Please try again.",
                });
            }
        });
        
   
        socket.on("disconnect", () => {
            // Mark user as offline
            const userId = socket.data.userId;
            if (userId) {
                onlineUsers[userId] = false;
                io.emit("userStatusUpdate", { userId, isOnline: false }); // Notify others about offline status
            }

            // Remove user from connected lists
            for (const customerId in connectedCustomers) {
                if (connectedCustomers[customerId] === socket.id) {
                    delete connectedCustomers[customerId];
                    console.log(`Customer ${customerId} disconnected`);
                    break;
                }
            }

            for (const providerId in connectedProviders) {
                if (connectedProviders[providerId] === socket.id) {
                    delete connectedProviders[providerId];
                    console.log(`ServiceProvider ${providerId} disconnected`);
                    break;
                }
            }
        });
    });

    return io;
};