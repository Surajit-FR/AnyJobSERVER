
import express, { Router } from "express";
import ModelAuth from "../middlewares/auth/modelAuth";
import ValidateUser from "../models/validator/user.validate";
import {
    refreshAccessToken,
    logoutUser,
    loginUser,
    registerUser,
    AuthUserSocial,    
} from "../controller/auth/auth.controller";
import { upload } from "../middlewares/multer.middleware";
import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import {HandleSocialAuthError} from '../middlewares/auth/socialAuth';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';


const router: Router = express.Router();

//sign-up
router.route('/signup').post(
    rateLimiter,
    upload.fields([
        { name: "avatar", maxCount: 1 },
    ]),
    [ModelAuth(ValidateUser)],
    registerUser,
    // loginUser
);

// Auth user (social)
router.post('/user/social',rateLimiter, [ HandleSocialAuthError], AuthUserSocial);

//login or sign-in route
router.route('/signin').post(
    rateLimiter,
    loginUser
);

/***************************** secured routes *****************************/
// Logout
router.route('/logout').post(
    rateLimiter,
    [VerifyJWTToken],
    logoutUser
);

// Refresh token routes
router.route('/refresh-token').post(
    rateLimiter,
    refreshAccessToken
);


export default router;