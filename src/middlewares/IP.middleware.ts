import { Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { CustomRequest } from '../../types/commonType';


export const captureIPMiddleware = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    console.log("Middleware runs:..");

    // Extract the IP address from the request
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    // Attach the IP address to the request object
    if (ip === "::1") {
        req.ipAddress = "127.0.0.1";
    }
    req.ipAddress = ip as string;
    const logDetails = {
        message: "IP captured",
        ipAddress: req.ipAddress,
        route: req.originalUrl,
        method: req.method,
        protocol: req.protocol,
        hostname: req.hostname,
        queryParams: req.query,
        headers: {
            'content-type': req.headers['content-type'],
            'accept-language': req.headers['accept-language'],
            'user-agent': req.headers['user-agent'],
        },
        cookies: req.cookies || "No Cookies",
        referer: req.headers['referer'] || req.headers['referrer'] || "Direct Access",
        authenticatedUser: req.user || "Guest",
        timestamp: new Date().toISOString(),
    };
    console.log(logDetails); 
    next();
});
