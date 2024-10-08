"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_middleware_1 = require("../middlewares/multer.middleware");
const userAuth_1 = require("../middlewares/auth/userAuth");
const auth_controller_1 = require("../controller/auth/auth.controller");
const router = express_1.default.Router();
//Protected routes for users
router.use(userAuth_1.VerifyJWTToken);
//get user
router.route('/get-user').get(auth_controller_1.getUser);
//add user Address
router.route('/add-address/:userId').post((0, userAuth_1.verifyUserType)(["ServiceProvider"]), auth_controller_1.addAddress);
//add user additional information
router.route('/add-additional-info/:userId').post(multer_middleware_1.upload.fields([
    { name: "driverLicenseImage" },
    { name: "companyLicenseImage" },
    { name: "licenseProofImage" },
    { name: "businessLicenseImage" },
    { name: "businessImage" },
]), (0, userAuth_1.verifyUserType)(["ServiceProvider"]), auth_controller_1.addAdditionalInfo);
exports.default = router;
