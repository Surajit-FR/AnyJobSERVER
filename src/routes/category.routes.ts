import express, { Router } from 'express';
import {
    addCategory,
    updateCategory,
    deleteCategory,
    getCategories
} from "../controller/category.controller";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateCategory from '../models/validator/category.validate';
import { upload } from '../middlewares/multer.middleware';

const router: Router = express.Router();
// router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/')
.get(getCategories)
.post(
    upload.fields([
        { name: "categoryImage"},
    ]),
    [ModelAuth(validateCategory)],
    addCategory);

router.route("/c/:CategoryId").delete(deleteCategory).put( updateCategory);

export default router


