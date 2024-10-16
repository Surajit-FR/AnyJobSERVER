import express, { Router } from "express";
import {
    getCategories,
} from "../../controller/category.controller";
import {
    getSubCategories,
} from "../../controller/subcategory.controller";

const router: Router = express.Router();

//without token

//get all categories
router.route('/get-all-categories').get(getCategories);

//get all subcategories
router.route('/get-all-subcategories').get(getSubCategories);

export default router;