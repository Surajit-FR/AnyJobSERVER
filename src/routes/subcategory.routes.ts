import express, { Router } from "express";
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
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
    verifyUserType(['SuperAdmin']),
    addSubCategory);

router.route("/c/:SubCategoryId")
    .get(getSubCategorieById)
    .delete(
        verifyUserType(['SuperAdmin']),
        deleteSubCategory
    )
    .patch(
        upload.fields([{ name: "subCategoryImage" }]),
        verifyUserType(['SuperAdmin']),
        updateSubCategory
    );

router.route('/').get(getSubCategories);


export default router;