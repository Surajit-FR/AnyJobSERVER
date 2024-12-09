import express, { Router } from 'express';
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { addRating, deleteRating } from '../controller/rating.controller';
import { captureIPMiddleware } from '../middlewares/IP.middleware';

const router: Router = express.Router();
router.use(VerifyJWTToken); 

router.route('/')
    .post(addRating);
router.route('/r/:ratingId')
    .delete(verifyUserType(["SuperAdmin"]), captureIPMiddleware, deleteRating);


export default router;