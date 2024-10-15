import express, { Router } from 'express';
import { sendOTP,verifyOTP } from "../controller/otp.controller";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';

const router: Router = express.Router();

router.route('/send-otp').post(sendOTP);

router.route('/verify-otp').post(verifyOTP);


export default router;
