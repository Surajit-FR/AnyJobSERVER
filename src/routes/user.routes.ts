import express, { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { VerifyJWTToken, verifyUserType } from "../middlewares/auth/userAuth";
import {
    getUser,
    addAddress,
    addAdditionalInfo,
    getServiceProviderList,
    getRegisteredCustomerList,
    getUsers
} from "../controller/user.controller";


const router: Router = express.Router();

//Protected routes for users
router.use(VerifyJWTToken);

//get user
router.route('/get-user').get(getUser);

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

//fetch serviceProvider List
router.route('/get-service-providers').get(getServiceProviderList);

//fetch customers List
router.route('/get-registered-customers').get(getRegisteredCustomerList);

//fetch users List
router.route('/get-users').get(getUsers);





export default router;