import express, { Router } from "express";
import { VerifyJWTToken, VerifySuperAdminJWTToken, VerifyServiceProviderJWTToken } from '../middlewares/auth/userAuth';
import { upload } from "../middlewares/multer.middleware";
import {
    addSubCategory,
    deleteSubCategory,
    getSubCategories,
    updateSubCategory,
    getSubCategorieById
} from "../controller/subcategory.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken)

router.route('/').post(
    upload.fields([
        { name: "subCategoryImage" }
    ]),
    VerifySuperAdminJWTToken,
    addSubCategory);

router.route("/c/:SubCategoryId").get(getSubCategorieById).delete(VerifySuperAdminJWTToken, deleteSubCategory).patch(VerifySuperAdminJWTToken, updateSubCategory);

router.route('/:categoryId').get(getSubCategories);


export default router;