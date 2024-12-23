import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { socketAuthMiddleware } from "../middlewares/auth/socketAuth";
import { handleServiceRequestState, fetchAssociatedCustomer } from "../controller/service.controller";
import { saveChatMessage, updateChatList } from "../controller/chat.controller";



// Function to initialize Socket.io
export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        }
    });

    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuthMiddleware);

    // Store connected customers
    const connectedCustomers: { [key: string]: string } = {};
    const connectedProviders: { [key: string]: string } = {};

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        const usertype = socket.data.userType;
        console.log(`A ${usertype} with userId ${userId} connected on socket ${socket.id}`);

        if (usertype === "Customer") {
            connectedCustomers[userId] = socket.id;
        } else if (usertype === "ServiceProvider") {
            connectedProviders[userId] = socket.id;
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

        // Handle chat messages
        socket.on("chatMessage", async (message: { toUserId: string; content: string }) => {
            const { toUserId, content } = message;

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