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
        const userToken = socket.handshake.headers.accesstoken;
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


        // update fetch nearby service requests list
        socket.on("updateNearbyServices",async () => {
            try {
                console.log(`Fetching nearby service requests `);
                // console.log({userToken});
                
                // Make an HTTP GET request to fetch nearby services
                const response = await axios.get(`${process.env.BASE_URL}/service/nearby-services-request`, {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                });

                console.log({ response: response.data.data });


                // Send the updated array of service requests back to the client
                io.to('ProvidersRoom').emit("nearbyServicesUpdate", {
                    success: true,
                    services: response.data,
                });
            } catch (error) {
                socket.emit("nearbyServicesUpdate", {
                    success: false,
                    error: "Failed to fetch nearby services. Please try again.",
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
            // Save the chat message in the database
            await saveChatMessage({
                fromUserId: userId,
                toUserId,
                content,
                timestamp: new Date(),
            });
            const now = new Date();

            await updateChatList(userId, toUserId, content, now);
            await updateChatList(toUserId, userId, content, now);
            io.emit("chatMessage", {
                text: "hello"
            })



            // console.log("chatMessage event run");


            // Send the chat message to the recipient if they're connected
            if (usertype === "Customer" || connectedProviders[toUserId]) {
                io.to(connectedProviders[toUserId]).emit("chatMessage", {
                    fromUserId: userId,
                    content,
                    timestamp: new Date(),
                });
            } else if (usertype === "ServiceProvider" || connectedCustomers[toUserId]) {
                io.to(connectedCustomers[toUserId]).emit("chatMessage", {
                    fromUserId: userId,
                    content,
                    timestamp: new Date(),
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