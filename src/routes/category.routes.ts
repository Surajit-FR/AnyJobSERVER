import express, { Router } from 'express';
import {
    getCategories,
    addCategory,
    deleteCategory,
    updateCategory,
    getCategorieById
} from "../controller/category.controller";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateCategory from '../models/validator/category.validate';
import { upload } from '../middlewares/multer.middleware';
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { captureIPMiddleware } from '../middlewares/IP.middleware';

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply SuperAdmin verifyJWT middleware

router.route('/').post(
    upload.fields([
        { name: "categoryImage" },
    ]),
    [ModelAuth(validateCategory)],
    verifyUserType(['SuperAdmin']),
    captureIPMiddleware,
    addCategory);

router.route("/c/:CategoryId")
    .get(getCategorieById)
    .delete(verifyUserType(['SuperAdmin']), deleteCategory)
    .put(verifyUserType(['SuperAdmin']), upload.fields([
        { name: "categoryImage" },
    ]), updateCategory);

router.route('/').get(getCategories);


export default router