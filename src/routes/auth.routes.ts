
import express, { Router } from "express";
import ModelAuth from "../middlewares/auth/modelAuth";
import ValidateUser from "../models/validator/user.validate";
import {
    refreshAccessToken,
    logoutUser,
    loginUser,
    registerUser,
    AuthUserSocial,
    getUser,
    addAddress,
    addAdditionalInfo
} from "../controller/auth/auth.controller";
import { upload } from "../middlewares/multer.middleware";
import validateUser from "../models/validator/user.validate";
import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import {HandleSocialAuthError} from '../middlewares/auth/socialAuth';


const router: Router = express.Router();

//sign-up
router.route('/signup').post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
    ]),
    [ModelAuth(ValidateUser)],
    registerUser,
    // loginUser
);

// Auth user (social)
router.post('/user/social', [ HandleSocialAuthError], AuthUserSocial);

//login or sign-in route
router.route('/signin').post(
    loginUser
);

/***************************** secured routes *****************************/
// Logout
router.route('/logout').post(
    [VerifyJWTToken],
    logoutUser
);

// Refresh token routes
router.route('/refresh-token').post(
    refreshAccessToken
);

router.use(VerifyJWTToken);
//get user
router.route('/get-user').get(getUser)

//add Address
router.route('/add-address').post(addAddress);

//add user additional information
router.route('/add-additional-info').post(
    upload.fields([
        { name: "driverLicenseImage"},
        { name: "companyLicenseImage"},
        { name: "licenseProofImage"},
        { name: "businessLicenseImage"},
        { name: "businessImage"},
    ]),
    addAdditionalInfo);


export default router;