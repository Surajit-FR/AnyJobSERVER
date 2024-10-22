import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { addQuestions, fetchQuestionsCategorywise, fetchSingleQuestion, updateSingleQuestion, fetchQuestions, deleteSingleQuestion } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/')
.post(verifyUserType(['SuperAdmin']), addQuestions)
.get(fetchQuestions);

router.route('/:categoryId').get(fetchQuestionsCategorywise);

router.route('/:categoryId/:questionId').get(fetchSingleQuestion);

router.route('/:categoryId/:questionId')
    .patch(verifyUserType(["SuperAdmin"]), updateSingleQuestion);

router.route('/:questionId').delete(verifyUserType(["SuperAdmin"]), deleteSingleQuestion);
   



export default router;