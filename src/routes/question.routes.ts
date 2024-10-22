import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { addQuestions, fetchQuestionsCategorywise, fetchSingleQuestion, updateSingleQuestion } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/').post(verifyUserType(['SuperAdmin']), addQuestions);
router.route('/:categoryId').get(fetchQuestionsCategorywise);
router.route('/:subcategoryId/:questionId').get(fetchSingleQuestion);
router.route('/:subcategoryId/:questionId').patch(verifyUserType(["SuperAdmin"]), updateSingleQuestion);



export default router;