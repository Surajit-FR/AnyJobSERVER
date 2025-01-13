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
    assignTeamLead,
    getAgentEngagementStatus,
    getAdminUsersList,
    fetchIPlogs,
    updateUser
} from "../controller/user.controller";
import { givePermission, getUserPermissions } from "../controller/permission.controller";
import { captureIPMiddleware } from "../middlewares/IP.middleware";
import { getJobByStatus } from "../controller/service.controller";


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
        { name: "driverLicenseImage", maxCount: 2 },
        { name: "companyLicenseImage", maxCount: 1 },
        { name: "licenseProofImage", maxCount: 1 },
        { name: "businessLicenseImage", maxCount: 1 },
        { name: "businessImage", maxCount: 1 },
    ]),
    verifyUserType(["ServiceProvider"]),
    addAdditionalInfo);

//fetch serviceProvider List
router.route('/get-service-providers').get(getServiceProviderList);

//fetch customers List
router.route('/get-registered-customers').get(getRegisteredCustomerList);

//fetch admin users List
router.route('/get-admin-users').get(getAdminUsersList);

//fetch users List
router.route('/get-users').get(getUsers);

//fetch associate List
router.route('/get-associates').get(verifyUserType(["SuperAdmin", "ServiceProvider"]), fetchAssociates);
router.route('/get-agent-engagement').get(verifyUserType(["SuperAdmin", "ServiceProvider"]), getAgentEngagementStatus);


router.route('/u/:userId')
    .get(verifyUserType(["SuperAdmin", "ServiceProvider"]), getSingleUser)
    .patch(verifyUserType(["SuperAdmin"]), captureIPMiddleware, banUser);

router.route('/update-user').put(verifyUserType(['SuperAdmin', 'ServiceProvider', 'Customer', 'FieldAgent', 'TeamLead']), upload.fields([
    { name: "userImage" },
]), updateUser);

router.route('/verify/:serviceProviderId').patch(
    verifyUserType(["SuperAdmin"]),
    captureIPMiddleware,
    verifyServiceProvider
);

router.route('/assign-teamlead').post(
    [VerifyJWTToken],
    verifyUserType(["ServiceProvider"]),
    assignTeamLead
);

router.route("/give-permission").post(verifyUserType(['SuperAdmin', 'ServiceProvider']), captureIPMiddleware, givePermission);

router.route("/fetch-permission").get(verifyUserType(['SuperAdmin', 'ServiceProvider']), getUserPermissions);

router.route("/fetch-iplogs").get(verifyUserType(['SuperAdmin']), fetchIPlogs);

router.route('/fetch-job-by-status').post(
    [VerifyJWTToken],
    verifyUserType(["ServiceProvider"]),
    getJobByStatus
);



export default router;