import express, { Router } from "express";
import SubCategoryModel from "../models/subcategory.model";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateSubCategory from "../models/validator/subcategory.validate";
import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import { upload } from "../middlewares/multer.middleware";
import {
    getSubCategories,
} from "../controller/subcategory.controller";

const router: Router = express.Router();
router.use(VerifyJWTToken)

router.route('/:categoryId').get(getSubCategories)


export default router
