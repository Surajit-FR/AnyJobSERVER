
import express, { Router } from "express";
import ModelAuth from "../middlewares/auth/modelAuth";
import ValidateUser from "../models/validator/user.validate";
import {
    refreshAccessToken,
    logoutUser,
    loginUser,
    registerUser,
    AuthUserSocial,
    addAssociate,
    forgetPassword,
    resetPassword,
    createAdminUsers,
    saveFcmToken
} from "../controller/auth/auth.controller";


import { upload } from "../middlewares/multer.middleware";
import { VerifyJWTToken, verifyUserType } from "../middlewares/auth/userAuth";
import { HandleSocialAuthError } from '../middlewares/auth/socialAuth';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';
import { captureIPMiddleware } from "../middlewares/IP.middleware";
import { CheckJWTTokenExpiration } from '../utils/auth';



const router: Router = express.Router();

//sign-up
router.route('/signup').post(
    rateLimiter,
    upload.fields([
        { name: "avatar", maxCount: 1 },
    ]),
    registerUser,
);

// Auth user (social)
router.post('/user/social', rateLimiter, [HandleSocialAuthError], AuthUserSocial);

//login or sign-in route
router.route('/signin').post(
    rateLimiter,
    loginUser
);

/***************************** secured routes *****************************/
// Logout
router.route('/save-fcm-token').post(
    rateLimiter,
    [VerifyJWTToken],
    saveFcmToken
);
// Logout
router.route('/logout').post(
    rateLimiter,
    [VerifyJWTToken],
    logoutUser
);
router.route('/add-associate').post(
    rateLimiter,
    [VerifyJWTToken],
    verifyUserType(["ServiceProvider", 'TeamLead']),
    addAssociate
);
router.route('/add-admin-user').post(
    rateLimiter,
    [VerifyJWTToken],
    verifyUserType(["SuperAdmin"]),
    createAdminUsers
);

// Refresh token routes
router.route('/refresh-token').post(
    rateLimiter,
    refreshAccessToken
);

router.route("/forget-password").post(forgetPassword);
router.route("/reset-password").post([VerifyJWTToken], resetPassword);

//check-token-expiration
router.route("/check-token-expiration").get([VerifyJWTToken], CheckJWTTokenExpiration);



export default router;


