"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_middleware_1 = require("../middlewares/multer.middleware");
const userAuth_1 = require("../middlewares/auth/userAuth");
const user_controller_1 = require("../controller/user.controller");
const permission_controller_1 = require("../controller/permission.controller");
const IP_middleware_1 = require("../middlewares/IP.middleware");
const router = express_1.default.Router();
//Protected routes for users
router.use(userAuth_1.VerifyJWTToken);
//get user
router.route('/get-user').get(user_controller_1.getUser);
//add user Address
router.route('/add-address').post((0, userAuth_1.verifyUserType)(["ServiceProvider"]), user_controller_1.addAddress);
//add user additional information
router.route('/add-additional-info').post(multer_middleware_1.upload.fields([
    { name: "driverLicenseImage", maxCount: 2 },
    { name: "companyLicenseImage", maxCount: 1 },
    { name: "licenseProofImage", maxCount: 1 },
    { name: "businessLicenseImage", maxCount: 1 },
    { name: "businessImage", maxCount: 1 },
]), (0, userAuth_1.verifyUserType)(["ServiceProvider"]), user_controller_1.addAdditionalInfo);
//fetch serviceProvider List
router.route('/get-service-providers').get(user_controller_1.getServiceProviderList);
//fetch customers List
router.route('/get-registered-customers').get(user_controller_1.getRegisteredCustomerList);
//fetch admin users List
router.route('/get-admin-users').get(user_controller_1.getAdminUsersList);
//fetch users List
router.route('/get-users').get(user_controller_1.getUsers);
//fetch associate List
router.route('/get-associates/:serviceProviderId').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), user_controller_1.fetchAssociates);
router.route('/get-agent-engagement').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), user_controller_1.getAgentEngagementStatus);
router.route('/u/:userId')
    .get(user_controller_1.getSingleUser)
    .patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), IP_middleware_1.captureIPMiddleware, user_controller_1.banUser);
router.route('/verify/:serviceProviderId').patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), IP_middleware_1.captureIPMiddleware, user_controller_1.verifyServiceProvider);
router.route('/assign-teamlead').post([userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["ServiceProvider"]), user_controller_1.assignTeamLead);
router.route("/give-permission").post((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), IP_middleware_1.captureIPMiddleware, permission_controller_1.givePermission);
router.route("/fetch-permission").get((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), permission_controller_1.getUserPermissions);
router.route("/fetch-iplogs").get((0, userAuth_1.verifyUserType)(['SuperAdmin']), user_controller_1.fetchIPlogs);
exports.default = router;
