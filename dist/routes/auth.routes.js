"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controller/auth/auth.controller");
const multer_middleware_1 = require("../middlewares/multer.middleware");
const userAuth_1 = require("../middlewares/auth/userAuth");
const socialAuth_1 = require("../middlewares/auth/socialAuth");
const rateLimiter_middleware_1 = require("../middlewares/rateLimiter.middleware");
const auth_1 = require("../utils/auth");
const sendPushNotification_1 = require("../utils/sendPushNotification");
const router = express_1.default.Router();
router.route('/store-fcm-token').post(sendPushNotification_1.storeFcmToken);
//sign-up
router.route('/signup').post(rateLimiter_middleware_1.rateLimiter, multer_middleware_1.upload.fields([
    { name: "avatar", maxCount: 1 },
]), auth_controller_1.registerUser);
// Auth user (social)
router.post('/user/social', rateLimiter_middleware_1.rateLimiter, [socialAuth_1.HandleSocialAuthError], auth_controller_1.AuthUserSocial);
//login or sign-in route
router.route('/signin').post(rateLimiter_middleware_1.rateLimiter, auth_controller_1.loginUser);
/***************************** secured routes *****************************/
// Logout
router.route('/save-fcm-token').post(rateLimiter_middleware_1.rateLimiter, [userAuth_1.VerifyJWTToken], auth_controller_1.saveFcmToken);
// Logout
router.route('/logout').post(rateLimiter_middleware_1.rateLimiter, [userAuth_1.VerifyJWTToken], auth_controller_1.logoutUser);
router.route('/add-associate').post(rateLimiter_middleware_1.rateLimiter, [userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["ServiceProvider", 'TeamLead']), auth_controller_1.addAssociate);
router.route('/add-admin-user').post(rateLimiter_middleware_1.rateLimiter, [userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["SuperAdmin"]), auth_controller_1.createAdminUsers);
// Refresh token routes
router.route('/refresh-token').post(rateLimiter_middleware_1.rateLimiter, auth_controller_1.refreshAccessToken);
router.route("/forget-password").post(auth_controller_1.forgetPassword);
router.route("/reset-password").post(auth_controller_1.resetPassword);
//check-token-expiration
router.route("/check-token-expiration").get(auth_1.CheckJWTTokenExpiration);
//emial verification 
router.route("/send-code-email").post(auth_controller_1.sendOTPEmail);
exports.default = router;
