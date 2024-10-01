import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { socketAuthMiddleware } from "../middlewares/auth/socketAuth";
import { updateServiceRequest } from "../controller/service.controller";


// Function to initialize Socket.io
export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        }
    });

    // Use the JWT authentication middleware for all socket connections
    io.use(socketAuthMiddleware);

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        console.log("socket=>", socket.handshake);


        console.log(`Service provider with userId ${userId} connected on socket ${socket.id}`);

        socket.on("acceptServiceRequest", (requestId: string) => {
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