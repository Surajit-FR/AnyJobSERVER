import { Socket, ExtendedError } from 'socket.io';
import jwt from 'jsonwebtoken';


// Middleware function to verify JWT token for socket connections
export const socketAuthMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => {
    const JWT_SECRET = process.env.REFRESH_TOKEN_SECRET;
    console.log({ JWT_SECRET });
    const token = socket.handshake.headers.accesstoken;

    if (!token) {
        // If no token is provided, block the connection
        return next(new Error("Authentication error: No token provided"));
    }

    // Verify the token
    jwt.verify(token as string, JWT_SECRET as string, (err, decoded) => {
        if (err) {
            // console.log({ JWT_SECRET });
            // If token is invalid or expired, reject the connection
            return next(new Error("Authentication error: Invalid token"));
        }

        // Attach the decoded user information (e.g., userId) to the socket object
        socket.data.userId = (decoded as any)._id; // Store _id in socket's data object for future use
        console.log(socket.data.userId);

        next(); // Allow the connection to proceed
    });
};
