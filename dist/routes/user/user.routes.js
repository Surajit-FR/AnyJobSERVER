"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("../../controller/category.controller");
const shift_controller_1 = require("../../controller/shift.controller");
const question_controller_1 = require("../../controller/question.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const service_controller_1 = require("../../controller/service.controller");
const contactUs_controller_1 = require("../../controller/contactUs.controller");
const router = express_1.default.Router();
//without token
//Categories
router.route("/demo/api/v1/get-all-categories").get(category_controller_1.getCategories);
//questions
router.route("/demo/api/v1/fetch-all-question").get(question_controller_1.fetchQuestions);
router.route("/demo/api/v1/q/:categoryId/:questionId").get(question_controller_1.fetchSingleQuestion);
//Shifts
router.route("/demo/api/v1/get-all-shifts").get(shift_controller_1.fetchShifs);
router.route("/demo/api/v1/fetch-shift/:shiftId").get(shift_controller_1.fetchShiftbyId);
router
    .route("/demo/api/v1/nearby-services-providers/:serviceRequestId")
    .get(service_controller_1.fetchNearByServiceProvider);
// protected customer routes------------
router.use(userAuth_1.VerifyJWTToken);
router
    .route("/demo/api/v1/get-service-request")
    .post((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.getServiceRequestByStatus);
router
    .route("/demo/api/v1/fetch-assigned-sp/:serviceId")
    .get((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.fetchAssignedserviceProvider);
router
    .route("/demo/api/v1/send-query-message")
    .post((0, userAuth_1.verifyUserType)(["Customer"]), contactUs_controller_1.sendQueryMessage);
router
    .route("/demo/api/v1/cancel-service")
    .put((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.cancelServiceRequest);
router
    .route("/demo/api/v1/add-incentive")
    .put((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.addorUpdateIncentive);
router
    .route("/demo/api/v1/fetch-service-history")
    .get((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.fetchServiceAddressHistory);
exports.default = router;
