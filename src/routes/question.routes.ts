import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { fetchQuestionsSubCategorywise,fetchSingleQuestion } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/:subCategoryId').get(fetchQuestionsSubCategorywise);
router.route('/:subcategoryId/:questionId').get(fetchSingleQuestion);



export default router;