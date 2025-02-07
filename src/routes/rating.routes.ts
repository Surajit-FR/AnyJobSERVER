import express, { Router } from 'express';
import { VerifyJWTToken, verifyUserType } from '../middlewares/auth/userAuth';
import { addRating, deleteRating,addAppRating, fetchAppRatingAnalysis, fetchAppRating } from '../controller/rating.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken); 

router.route('/')
    .post(addRating);
router.route('/r/:ratingId')
    .delete(verifyUserType(["SuperAdmin"]),  deleteRating);

router.route('/add-app-rating')
    .post(addAppRating);  

router.route('/fetch-app-rating-analysis')
    .get(fetchAppRatingAnalysis); 

router.route('/fetch-app-rating')
    .get(fetchAppRating);    


export default router;