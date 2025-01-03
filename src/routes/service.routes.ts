import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addService,
    getServiceRequestList,
    getAcceptedServiceRequestInJobQueue,
    updateServiceRequest,
    deleteService,
    fetchServiceRequest,
    handleServiceRequestState,
    fetchSingleServiceRequest,
    assignJob,
    totalJobCount,
} from "../controller/service.controller";
import { captureIPMiddleware } from "../middlewares/IP.middleware";

const router: Router = express.Router();

router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/')
    .post(verifyUserType(['Customer']), addService)
    .get(verifyUserType(['SuperAdmin']), getServiceRequestList);

router.route('/get-accepted-service-request')
    .get(getAcceptedServiceRequestInJobQueue);



router.route('/get-job-count')
    .get(verifyUserType(['ServiceProvider', 'TeamLead']), totalJobCount);

router.route('/nearby-services-request')
    .get(verifyUserType(['ServiceProvider']), fetchServiceRequest);

router.route('/assign-job')
    .patch(verifyUserType(['ServiceProvider', 'TeamLead']), assignJob);

router.route("/c/:serviceId")
    .get(verifyUserType(['SuperAdmin', "ServiceProvider", "Customer"]), fetchSingleServiceRequest)
    .delete(verifyUserType(['SuperAdmin']), captureIPMiddleware, deleteService)
    .put(verifyUserType(['SuperAdmin', 'ServiceProvider']), captureIPMiddleware, updateServiceRequest)
    .patch(verifyUserType(["ServiceProvider", 'TeamLead', 'FieldAgent']), handleServiceRequestState);

export default router;