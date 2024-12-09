import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addShift,
    fetchShiftbyId,
    fetchShifs,
    updateShift,
    deleteShift
} from '../controller/shift.controller';
import { captureIPMiddleware } from "../middlewares/IP.middleware";

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/')
    .get(fetchShifs)
    .post(verifyUserType(['SuperAdmin']), captureIPMiddleware, addShift);

router.route('/:shiftId')
    .get(fetchShiftbyId)
    .patch(verifyUserType(['SuperAdmin']), captureIPMiddleware, updateShift)
    .delete(verifyUserType(['SuperAdmin']), captureIPMiddleware, deleteShift)




export default router;