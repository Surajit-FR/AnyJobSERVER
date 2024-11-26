import express, { Router } from "express";
import {
    getCategories,
} from "../../controller/category.controller";

import {
    fetchShiftbyId,
    fetchShifs,
} from "../../controller/shift.controller";

import {
    fetchQuestions,
    fetchSingleQuestion
} from "../../controller/question.controller"

const router: Router = express.Router();

//without token

//Categories
router.route('/get-all-categories').get(getCategories);

//questions
router.route('/fetch-all-question').get(fetchQuestions);
router.route('/q/:categoryId/:questionId').get(fetchSingleQuestion)

//Shifts
router.route('/get-all-shifts').get(fetchShifs);
router.route('/fetch-shift/:shiftId').get(fetchShiftbyId);




export default router;