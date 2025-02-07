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
router.route('/get-all-categories').get(category_controller_1.getCategories);
//questions
router.route('/fetch-all-question').get(question_controller_1.fetchQuestions);
router.route('/q/:categoryId/:questionId').get(question_controller_1.fetchSingleQuestion);
//Shifts
router.route('/get-all-shifts').get(shift_controller_1.fetchShifs);
router.route('/fetch-shift/:shiftId').get(shift_controller_1.fetchShiftbyId);
router.route('/nearby-services-providers/:serviceRequestId')
    .get(service_controller_1.fetchNearByServiceProvider);
// protected customer routes------------
router.use(userAuth_1.VerifyJWTToken);
router.route('/get-service-request')
    .post((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.getServiceRequestByStatus);
router.route('/fetch-assigned-sp/:serviceId')
    .get((0, userAuth_1.verifyUserType)(["Customer"]), service_controller_1.fetchAssignedserviceProvider);
router.route('/send-query-message').post((0, userAuth_1.verifyUserType)(["Customer"]), contactUs_controller_1.sendQueryMessage);
router.route('/cancel-service').put((0, userAuth_1.verifyUserType)(['Customer',]), service_controller_1.cancelServiceRequest);
router.route('/add-incentive').put((0, userAuth_1.verifyUserType)(['Customer',]), service_controller_1.addorUpdateIncentive);
router.route('/fetch-service-history').get((0, userAuth_1.verifyUserType)(['Customer',]), service_controller_1.fetchServiceAddressHistory);
exports.default = router;
