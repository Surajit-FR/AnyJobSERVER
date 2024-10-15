import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { fetchQuestionsSubCategorywise, fetchSingleQuestion, updateSingleQuestion } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken);

router.route('/:subCategoryId').get(fetchQuestionsSubCategorywise);
router.route('/:subcategoryId/:questionId').get(fetchSingleQuestion);
router.route('/:subcategoryId/:questionId').patch(verifyUserType(["SuperAdmin"]), updateSingleQuestion);



export default router;