import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import {
    addQuestions,
    // fetchQuestionsCategorywise,
    fetchSingleQuestion,
    updateSingleQuestion,
    fetchQuestions,
    deleteSingleQuestion
} from "../controller/question.controller";
import { captureIPMiddleware } from "../middlewares/IP.middleware";

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/')
    .post(verifyUserType(['SuperAdmin']), captureIPMiddleware, addQuestions)
    .get(fetchQuestions);

// router.route('/:categoryId').get(fetchQuestionsCategorywise);

router.route('/q/:categoryId/:questionId')
    .get(fetchSingleQuestion)
    .patch(verifyUserType(["SuperAdmin"]), captureIPMiddleware, updateSingleQuestion)

router.route('/q/:questionId')
    .delete(verifyUserType(["SuperAdmin"]), captureIPMiddleware, deleteSingleQuestion);




export default router;