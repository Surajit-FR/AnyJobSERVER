import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { fetchQuestionsSubCategorywise, } from "../controller/question.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/:subCategoryId').get(fetchQuestionsSubCategorywise);


export default router;