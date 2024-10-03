import express, { Router } from "express";
import { VerifyJWTToken, VerifySuperAdminJWTToken, VerifyServiceProviderJWTToken, VerifyCustomerJWTToken } from '../middlewares/auth/userAuth';
import {
    addService,
    getPendingServiceRequest,
    updateServiceRequest,
    deleteService,
    fetchServiceRequest
} from "../controller/service.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/').post(VerifyCustomerJWTToken, addService);

router.route('/pending-service').get(getPendingServiceRequest);

router.route('/get-service').get(VerifyServiceProviderJWTToken, fetchServiceRequest);

router.route("/c/:serviceId").delete(VerifySuperAdminJWTToken, deleteService).put(VerifySuperAdminJWTToken,VerifyServiceProviderJWTToken, updateServiceRequest);


export default router;