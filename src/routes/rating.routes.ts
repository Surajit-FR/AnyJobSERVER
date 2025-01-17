import express, { Router } from 'express';
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { addRating, deleteRating } from '../controller/rating.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken); 

router.route('/')
    .post(addRating);
router.route('/r/:ratingId')
    .delete(verifyUserType(["SuperAdmin"]),  deleteRating);


export default router;