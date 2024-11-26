import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addService,
    getServiceRequestList,
    getPendingServiceRequest,
    updateServiceRequest,
    deleteService,
    fetchServiceRequest,
    handleServiceRequestState,
    fetchSingleServiceRequest,
    getServiceRequestByStatus,
    assignJob,
    totalJobCount
} from "../controller/service.controller";

const router: Router = express.Router();

router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/')
    .post(verifyUserType(['Customer']), addService)
    .get(verifyUserType(['SuperAdmin', 'ServiceProvider']), getServiceRequestList);

router.route('/get-pending-service')
    .get(getPendingServiceRequest);

router.route('/get-service-request')
    .get(getServiceRequestByStatus);

router.route('/get-job-count')
    .get(verifyUserType(['ServiceProvider', 'TeamLead']), totalJobCount);

router.route('/nearby-services-request')
    .get(verifyUserType(['ServiceProvider']), fetchServiceRequest);

router.route('/assign-job')
    .patch(verifyUserType(['ServiceProvider', 'TeamLead']), assignJob);

router.route("/c/:serviceId")
    .get(verifyUserType(['SuperAdmin', "ServiceProvider", "Customer"]), fetchSingleServiceRequest)
    .delete(verifyUserType(['SuperAdmin']), deleteService)
    .put(verifyUserType(['SuperAdmin', 'ServiceProvider']), updateServiceRequest)
    .patch(verifyUserType(["ServiceProvider", 'TeamLead']), handleServiceRequestState);

export default router;