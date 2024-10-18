import express, { Router } from "express";
import {
    getCategories,
} from "../../controller/category.controller";
import {
    getSubCategories,
} from "../../controller/subcategory.controller";
import {
    fetchShiftbyId,
    fetchShifs,
} from "../../controller/shift.controller";

const router: Router = express.Router();

//without token

//Categories
router.route('/get-all-categories').get(getCategories);

//Subcategories
router.route('/get-all-subcategories').get(getSubCategories);

//Shifts
router.route('/get-all-shifts').get(fetchShifs);
router.route('/fetch-shift/:shiftId').get(fetchShiftbyId);




export default router;