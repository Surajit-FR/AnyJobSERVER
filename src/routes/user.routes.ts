import express, { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { VerifyJWTToken, verifyUserType } from "../middlewares/auth/userAuth";
import {
    getUser,
    addAddress,
    addAdditionalInfo
} from "../controller/auth/auth.controller";


const router: Router = express.Router();

//Protected routes for users
router.use(VerifyJWTToken);

//get user
router.route('/get-user').get(getUser)

//add user Address
router.route('/add-address/:userId').post(verifyUserType(["ServiceProvider"]), addAddress);

//add user additional information
router.route('/add-additional-info/:userId').post(
    upload.fields([
        { name: "driverLicenseImage" },
        { name: "companyLicenseImage" },
        { name: "licenseProofImage" },
        { name: "businessLicenseImage" },
        { name: "businessImage" },
    ]),
    verifyUserType(["ServiceProvider"]),
    addAdditionalInfo);


export default router;