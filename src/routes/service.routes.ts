import express, { Router } from "express";
import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import ServiceModel from "../models/service.model";
import {
    addService,
    getPendingServiceRequest,
    updateServiceRequest,
    deleteService,
    fetchServiceRequest
} from "../controller/service.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file


router.route('/').post(addService);
router.route('/pending-service').get(getPendingServiceRequest);
router.route('/get-service').get(fetchServiceRequest);
router.route("/c/:serviceId").delete(deleteService).put(updateServiceRequest);


export default router;