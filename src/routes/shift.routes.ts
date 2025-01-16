import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addShift,
    fetchShiftbyId,
    fetchShifs,
    updateShift,
    deleteShift
} from '../controller/shift.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/')
    .get(fetchShifs)
    .post(verifyUserType(['SuperAdmin']),  addShift);

router.route('/:shiftId')
    .get(fetchShiftbyId)
    .patch(verifyUserType(['SuperAdmin']),  updateShift)
    .delete(verifyUserType(['SuperAdmin']),  deleteShift)




export default router;