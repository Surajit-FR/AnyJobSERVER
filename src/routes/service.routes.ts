import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addService,
    getPendingServiceRequest,
    updateServiceRequest,
    deleteService,
    fetchServiceRequest,
    acceptServiceRequest
} from "../controller/service.controller";

const router: Router = express.Router();

router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/').post(verifyUserType(['Customer']), addService);

router.route('/get-pending-service').get(getPendingServiceRequest);

router.route('/nearby-services-request').get(verifyUserType(['ServiceProvider']), fetchServiceRequest);

router.route("/c/:serviceId")
    .delete(verifyUserType(['SuperAdmin']), deleteService)
    .put(verifyUserType(['SuperAdmin', 'ServiceProvider']), updateServiceRequest)
    .patch(verifyUserType(["ServiceProvider"]), acceptServiceRequest);


export default router;