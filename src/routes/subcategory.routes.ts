import express, { Router } from "express";
import SubCategoryModel from "../models/subcategory.model";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateSubCategory from "../models/validator/subcategory.validate";
import { upload } from "../middlewares/multer.middleware";
import {
    addSubCategory,
    getSubCategories,
    updateSubCategory,
    deleteSubCategory
} from "../controller/subcategory.controller";

const router: Router = express.Router();

router.route('/').post(
    upload.fields([
        { name: "subCategoryImage" }
    ]),
    addSubCategory);
router.route('/:categoryId').get(getSubCategories)    

router.route("/c/:SubCategoryId").delete(deleteSubCategory).patch( updateSubCategory);

export default router
