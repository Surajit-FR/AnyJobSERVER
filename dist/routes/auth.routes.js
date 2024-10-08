"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const modelAuth_1 = __importDefault(require("../middlewares/auth/modelAuth"));
const user_validate_1 = __importDefault(require("../models/validator/user.validate"));
const auth_controller_1 = require("../controller/auth/auth.controller");
const multer_middleware_1 = require("../middlewares/multer.middleware");
const userAuth_1 = require("../middlewares/auth/userAuth");
const socialAuth_1 = require("../middlewares/auth/socialAuth");
const router = express_1.default.Router();
//sign-up
router.route('/signup').post(multer_middleware_1.upload.fields([
    { name: "avatar", maxCount: 1 },
]), [(0, modelAuth_1.default)(user_validate_1.default)], auth_controller_1.registerUser);
// Auth user (social)
router.post('/user/social', [socialAuth_1.HandleSocialAuthError], auth_controller_1.AuthUserSocial);
//login or sign-in route
router.route('/signin').post(auth_controller_1.loginUser);
/***************************** secured routes *****************************/
// Logout
router.route('/logout').post([userAuth_1.VerifyJWTToken], auth_controller_1.logoutUser);
// Refresh token routes
router.route('/refresh-token').post(auth_controller_1.refreshAccessToken);
router.use(userAuth_1.VerifyJWTToken);
exports.default = router;
