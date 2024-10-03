import express, { Router } from "express";
import { VerifySuperAdminJWTToken } from "../middlewares/auth/userAuth";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateCategory from '../models/validator/category.validate';
import { upload } from '../middlewares/multer.middleware';

import { addCategory, updateCategory, deleteCategory, } from "../controller/category.controller";
import { addSubCategory, updateSubCategory, deleteSubCategory } from "../controller/subcategory.controller";

const router: Router = express.Router();
router.use(VerifySuperAdminJWTToken);

// <====Categories====>
router.route('/category').post(
    upload.fields([
        { name: "categoryImage" },
    ]),
    [ModelAuth(validateCategory)],
    addCategory);
    

router.route("/c/:CategoryId").delete(deleteCategory).put(updateCategory);

// <====SubCategories====>
router.route('/subcategory').post(
    upload.fields([
        { name: "subCategoryImage" }
    ]),
    addSubCategory);

router.route("/c/:SubCategoryId").delete(deleteSubCategory).patch(updateSubCategory);



export default router




