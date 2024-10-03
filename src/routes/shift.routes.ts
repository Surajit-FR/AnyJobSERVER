import express, { Router } from "express";
import { VerifyJWTToken, VerifySuperAdminJWTToken, VerifyServiceProviderJWTToken } from '../middlewares/auth/userAuth';
import {
    addShift,
    fetchShift
} from '../controller/shift.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/').post(VerifySuperAdminJWTToken, addShift);

router.route('/:shiftId').get(fetchShift)


export default router;