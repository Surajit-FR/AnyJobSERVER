import express, { NextFunction, Request, Response } from 'express';
const app = express();
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cron from 'node-cron'


import { EXPRESS_CONFIG_LIMIT } from './constants';


app.use(cors({
    origin: ["https://frontend.theassure.co.uk", "http://localhost:3000", process.env.CORS_ORIGIN as string, "http://ec2-65-2-73-95.ap-south-1.compute.amazonaws.com", "http://65.2.73.95", '*', 'http://15.207.110.84'],
    // origin: "*",
    credentials: true,
}));
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', 'https://frontend.theassure.co.uk');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', "true");

    // Pass to next layer of middleware
    next();
});

app.use(morgan("dev"));
app.use(express.json({ limit: EXPRESS_CONFIG_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: EXPRESS_CONFIG_LIMIT }));
app.use(express.static("public"));
app.use(cookieParser());


//routes
import healthcheckRouter from "./routes/healthcheck.routes";
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import customerRouter from './routes/user/user.routes';
import categoryRouter from './routes/category.routes';
import serviceRouter from './routes/service.routes';
import questionRouter from './routes/question.routes';
import shiftRouter from './routes/shift.routes';
import otpRouter from './routes/otp.routes';
import ratingRouter from './routes/rating.routes';
import googleCloudRouter from './routes/googleCloud.routes';
import chatRouter from './routes/chat.routes';
import imageRouter from './routes/upload.routes';
import { removeStaleFcmTokens } from "../src/utils/sendPushNotification";

// Schedule cleanup every day at midnight
// cron.schedule("0 0 * * *", () => {
//     console.log("Midnight cron job starts...");

//     // Schedule a task every minute after midnight
//     cron.schedule("*/1 * * * *", removeStaleFcmTokens);

//     console.log("Scheduled the job to run every minute after midnight.");
// });

//Admin routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/auth", authRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/service', serviceRouter);
app.use('/api/v1/question', questionRouter);
app.use('/api/v1/shift', shiftRouter);
app.use('/api/v1/google-cloud', googleCloudRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/', imageRouter);

// Customer routes
app.use('/api/v1/customer', customerRouter);
app.use('/api/v1/otp', otpRouter);
app.use('/api/v1/rating', ratingRouter);

app.get('/ping', (req: Request, res: Response) => {
    res.send("Hi!...I am server, Happy to see you boss...");
});

//internal server error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.log(err);
    res.status(500).json({
        status: 500,
        message: "Server Error",
        error: err.message
    });
});

//page not found middleware handling
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        status: 404,
        message: "Endpoint Not Found"
    });
});


export { app };