import express, { Router } from 'express';
import {
    getCategories
} from "../controller/category.controller";
import ModelAuth from "../middlewares/auth/modelAuth";
import validateCategory from '../models/validator/category.validate';
import { upload } from '../middlewares/multer.middleware';
import { VerifyJWTToken } from '../middlewares/auth/userAuth';

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file

router.route('/').get(getCategories)



export default router


