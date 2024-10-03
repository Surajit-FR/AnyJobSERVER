import express, { Router } from "express";
import SubCategoryModel from "../models/subcategory.model";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateSubCategory from "../models/validator/subcategory.validate";
import { VerifyJWTToken, VerifySuperAdminJWTToken, VerifyServiceProviderJWTToken } from '../middlewares/auth/userAuth';
import { upload } from "../middlewares/multer.middleware";
import {
    addSubCategory,
    deleteSubCategory,
    getSubCategories,
    updateSubCategory,
} from "../controller/subcategory.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken)

router.route('/').post(
    upload.fields([
        { name: "subCategoryImage" }
    ]),
    VerifySuperAdminJWTToken,
    addSubCategory);

router.route("/c/:SubCategoryId").delete(VerifySuperAdminJWTToken, deleteSubCategory).patch(VerifySuperAdminJWTToken, updateSubCategory);

router.route('/:categoryId').get(getSubCategories)


export default router