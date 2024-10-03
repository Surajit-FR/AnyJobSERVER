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
import { VerifyJWTToken, VerifySuperAdminJWTToken, VerifyServiceProviderJWTToken } from '../middlewares/auth/userAuth';

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply SuperAdmin verifyJWT middleware

router.route('/').post(
    upload.fields([
        { name: "categoryImage" },
    ]),
    [ModelAuth(validateCategory)],
    VerifySuperAdminJWTToken,
    addCategory);

router.route("/c/:CategoryId").get(getCategorieById).delete(VerifySuperAdminJWTToken, deleteCategory).put(VerifySuperAdminJWTToken, updateCategory);

router.route('/').get(getCategories);


export default router