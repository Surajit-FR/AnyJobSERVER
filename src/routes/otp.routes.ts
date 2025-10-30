import express, { Router } from 'express';
import { sendOTP, verifyOTP } from "../controller/otp.controller";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { rateLimiter } from '../middlewares/rateLimiter.middleware'

const router: Router = express.Router();

router.route('/demo/api/v1/send').post(rateLimiter, sendOTP);

router.route('/demo/api/v1/verify').post(rateLimiter, verifyOTP);


export default router;
