import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { socketAuthMiddleware } from "../middlewares/auth/socketAuth";
import { handleServiceRequestState, fetchAssociatedCustomer } from "../controller/service.controller";


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

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        const usertype = socket.data.userType;
        console.log(`A ${usertype} with userId ${userId} connected on socket ${socket.id}`);

        if (usertype === "Customer") {
            connectedCustomers[userId] = socket.id;
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