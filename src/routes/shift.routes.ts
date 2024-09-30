import express, { Router } from "express";
import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import ShiftModel from "../models/shift.model";
import {
    addShift,
    fetchShift
} from '../controller/shift.controller';

const router:Router = express.Router();


router.route('/').post(addShift);
router.route('/:shiftId').get(fetchShift)

export default router;