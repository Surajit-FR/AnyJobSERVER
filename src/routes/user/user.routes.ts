import express, { Router } from "express";
import {
    getCategories,
} from "../../controller/category.controller";

import {
    fetchShiftbyId,
    fetchShifs,
} from "../../controller/shift.controller";

const router: Router = express.Router();

//without token

//Categories
router.route('/get-all-categories').get(getCategories);

//Shifts
router.route('/get-all-shifts').get(fetchShifs);
router.route('/fetch-shift/:shiftId').get(fetchShiftbyId);




export default router;