import express, { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { VerifyJWTToken, verifyUserType } from "../middlewares/auth/userAuth";
import {
    getUser,
    addAddress,
    addAdditionalInfo,
    getServiceProviderList,
    getRegisteredCustomerList,
    getUsers,
    verifyServiceProvider,
    getSingleUser,
    banUser,
    fetchAssociates,
    assignTeamLead
} from "../controller/user.controller";
import { givePermission, getUserPermissions } from "../controller/permission.controller";


const router: Router = express.Router();


//Protected routes for users
router.use(VerifyJWTToken);

//get user
router.route('/get-user').get(getUser);

//add user Address
router.route('/add-address').post(verifyUserType(["ServiceProvider"]), addAddress);

//add user additional information
router.route('/add-additional-info').post(
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

//fetch associate List
router.route('/get-associates/:serviceProviderId').get(verifyUserType(["SuperAdmin", "ServiceProvider"]), fetchAssociates);


router.route('/u/:userId')
    .get(getSingleUser)
    .patch(verifyUserType(["SuperAdmin"]), banUser);

router.route('/verify/:serviceProviderId').patch(
    verifyUserType(["SuperAdmin"]),
    verifyServiceProvider
);

router.route('/assign-teamlead').post(
    [VerifyJWTToken],
    verifyUserType(["ServiceProvider"]),
    assignTeamLead
);

router.route("/give-permission").post(verifyUserType(['SuperAdmin', 'ServiceProvider']), givePermission);
router.route("/fetch-permission").get(verifyUserType(['SuperAdmin', 'ServiceProvider']), getUserPermissions);


export default router;