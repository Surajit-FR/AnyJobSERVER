import express, { Router } from 'express';
import { VerifyJWTToken } from '../../middlewares/auth/userAuth';
import { addRating } from '../../controller/rating.controller';

const router: Router = express.Router();
router.use(VerifyJWTToken); // Apply SuperAdmin verifyJWT middleware

router.route('/').post(addRating);


export default router;