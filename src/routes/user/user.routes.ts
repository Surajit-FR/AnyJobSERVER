import express, { Router } from "express";
import { getCategories } from "../../controller/category.controller";

import { fetchShiftbyId, fetchShifs } from "../../controller/shift.controller";

import {
  fetchQuestions,
  fetchSingleQuestion,
} from "../../controller/question.controller";
import {
  VerifyJWTToken,
  verifyUserType,
} from "../../middlewares/auth/userAuth";
import {
  fetchNearByServiceProvider,
  getServiceRequestByStatus,
  fetchAssignedserviceProvider,
  cancelServiceRequest,
  addorUpdateIncentive,
  fetchServiceAddressHistory,
} from "../../controller/service.controller";

import { sendQueryMessage } from "../../controller/contactUs.controller";
const router: Router = express.Router();

//without token

//Categories
router.route("/demo/api/v1/get-all-categories").get(getCategories);

//questions
router.route("/demo/api/v1/fetch-all-question").get(fetchQuestions);
router.route("/demo/api/v1/q/:categoryId/:questionId").get(fetchSingleQuestion);

//Shifts
router.route("/demo/api/v1/get-all-shifts").get(fetchShifs);
router.route("/demo/api/v1/fetch-shift/:shiftId").get(fetchShiftbyId);

router
  .route("/demo/api/v1/nearby-services-providers/:serviceRequestId")
  .get(fetchNearByServiceProvider);

// protected customer routes------------

router.use(VerifyJWTToken);

router
  .route("/demo/api/v1/get-service-request")
  .post(verifyUserType(["Customer"]), getServiceRequestByStatus);

router
  .route("/demo/api/v1/fetch-assigned-sp/:serviceId")
  .get(verifyUserType(["Customer"]), fetchAssignedserviceProvider);

router
  .route("/demo/api/v1/send-query-message")
  .post(verifyUserType(["Customer"]), sendQueryMessage);

router
  .route("/demo/api/v1/cancel-service")
  .put(verifyUserType(["Customer"]), cancelServiceRequest);

router
  .route("/demo/api/v1/add-incentive")
  .put(verifyUserType(["Customer"]), addorUpdateIncentive);

router
  .route("/demo/api/v1/fetch-service-history")
  .get(verifyUserType(["Customer"]), fetchServiceAddressHistory);



export default router;