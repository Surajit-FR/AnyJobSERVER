import { Socket, ExtendedError } from 'socket.io';
import jwt from 'jsonwebtoken';


// Middleware function to verify JWT token for socket connections
export const socketAuthMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => {
    const JWT_SECRET = process.env.REFRESH_TOKEN_SECRET;
    // console.log({ JWT_SECRET });
    const token = socket.handshake.headers.accesstoken;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    // Verify the token
    jwt.verify(token as string, JWT_SECRET as string, (err, decoded) => {
        if (err) {
            // console.log({ JWT_SECRET });
            return next(new Error("Authentication error: Invalid token"));
        }
        socket.data.userId = (decoded as any)._id; 
        // console.log(socket.data.userId);

        next(); 
    });
};
