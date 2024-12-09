import { Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { CustomRequest } from '../../types/commonType';
import IPLog from '../models/IP.model';


export const captureIPMiddleware = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    console.log("Middleware runs...");

    // Extract the IP address
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    // Standardize localhost IP
    const standardizedIp = ip === "::1" ? "127.0.0.1" : (ip as string);

    // Determine if it's IPv4 or IPv6
    const isIPv4 = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(standardizedIp);
    const isIPv6 = /^[a-fA-F0-9:]+$/.test(standardizedIp) && !isIPv4;

    const logDetails = {
        ipAddress: standardizedIp,
        ipType: isIPv4 ? "IPv4" : isIPv6 ? "IPv6" : "Unknown",
        route: req.originalUrl,
        method: req.method,
        protocol: req.protocol,
        hostname: req.hostname,
        queryParams: req.query,
        headers: {
            contentType: req.headers["content-type"],
            userAgent: req.headers["user-agent"],
        },
        // cookies: req.cookies || "No Cookies",
        referer: req.headers["referer"] || req.headers["referrer"] || "Direct Access",
        userId: req.user?._id,
        userType: req.user?.userType,
        timestamp: new Date(),
    };

    // console.log(logDetails);

    // Save the details in the database
    const logEntry = new IPLog(logDetails);
    await logEntry.save();

    next();
});
