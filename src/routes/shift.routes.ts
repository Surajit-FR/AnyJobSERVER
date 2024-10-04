import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addShift,
    fetchShift
} from '../controller/shift.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/').post(verifyUserType(['SuperAdmin']), addShift);

router.route('/:shiftId').get(fetchShift)


export default router;