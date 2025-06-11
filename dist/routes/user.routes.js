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
const service_controller_1 = require("../controller/service.controller");
const IP_middleware_1 = require("../middlewares/IP.middleware");
const contactUs_controller_1 = require("../controller/contactUs.controller");
const notification_controller_1 = require("../controller/notification.controller");
const router = express_1.default.Router();
//Protected routes for users
router.use(userAuth_1.VerifyJWTToken);
//get user
// router.route('/get-user').get(getUser);
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
//fetch profile user 
router.route('/get-profile').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "Admin", "Finance", "ServiceProvider", 'Customer', 'FieldAgent', 'TeamLead']), user_controller_1.getUser);
//fetch iplogs
router.route('/fetch-iplogs').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "Admin", "Finance"]), user_controller_1.getIpLogs);
//fetch associate List
router.route('/get-associates').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), user_controller_1.fetchAssociates);
router.route('/get-agent-engagement').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), user_controller_1.getAgentEngagementStatus);
router.route('/u/:userId')
    .get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), user_controller_1.getSingleUser)
    .patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), user_controller_1.banUser);
router.route('/update-user').put((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider', 'Customer', 'FieldAgent', 'TeamLead']), multer_middleware_1.upload.fields([
    { name: "userImage" },
]), user_controller_1.updateUser);
router.route('/verify/:serviceProviderId').patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), user_controller_1.verifyServiceProvider);
router.route('/assign-teamlead').post([userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["ServiceProvider"]), user_controller_1.assignTeamLead);
router.route("/give-permission").post((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), permission_controller_1.givePermission);
router.route("/fetch-permission").get((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), permission_controller_1.getUserPermissions);
router.route("/fetch-iplogs").get((0, userAuth_1.verifyUserType)(['SuperAdmin']), user_controller_1.fetchIPlogs);
router.route('/fetch-job-by-status').post([userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["ServiceProvider",]), service_controller_1.getJobByStatus);
router.route('/fetch-job-by-status-by-agent').post([userAuth_1.VerifyJWTToken], (0, userAuth_1.verifyUserType)(["FieldAgent", "TeamLead"]), service_controller_1.getJobByStatusByAgent);
router.route('/add-bank-details').post((0, userAuth_1.verifyUserType)(["ServiceProvider", "Customer", "Admin", "Finance", "FieldAgent", "TeamLead"]), user_controller_1.addBankDetails);
router.route('/create-iplog').post((0, userAuth_1.verifyUserType)(["ServiceProvider", "Customer", "Admin", "Finance", "FieldAgent", "TeamLead", "SuperAdmin"]), IP_middleware_1.captureIP);
router.route('/fetch-query-messages').get((0, userAuth_1.verifyUserType)(["SuperAdmin",]), contactUs_controller_1.fetchQueryMessage);
router.route('/delete-query-message/:messageId').delete((0, userAuth_1.verifyUserType)(["SuperAdmin",]), contactUs_controller_1.deleteQueryMessage);
router.route('/update-user-preference').put((0, userAuth_1.verifyUserType)(['ServiceProvider', 'Customer', 'FieldAgent', 'TeamLead']), user_controller_1.updateUserPreference);
router.route('/fetch-notifications').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider", "Customer", "Admin", "Finance", "FieldAgent", "TeamLead"]), notification_controller_1.getNotifications);
router.route('/fetch-incentive-details').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "ServiceProvider"]), service_controller_1.fetchIncentiveDetails);
router.route('/fetch-payment-method').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "Customer"]), user_controller_1.getPaymentMethods);
router.route('/fetch-transactions').get((0, userAuth_1.verifyUserType)(["SuperAdmin", "Customer"]), user_controller_1.getCustomersTransaction);
router.route('/fetch-admin-received-fund').get((0, userAuth_1.verifyUserType)(["SuperAdmin",]), user_controller_1.fetchAdminReceivedFund);
exports.default = router;
