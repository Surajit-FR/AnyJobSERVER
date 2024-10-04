import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { fetchQuestionsSubCategorySubCategorywise, } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/:categoryId/:subCategoryId').get(fetchQuestionsSubCategorySubCategorywise);


export default router;