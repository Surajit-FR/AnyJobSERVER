import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addShift,
    fetchShiftbyId,
    fetchShifs
} from '../controller/shift.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/').get(fetchShifs).post(verifyUserType(['SuperAdmin']), addShift);

router.route('/:shiftId').get(fetchShiftbyId)


export default router;