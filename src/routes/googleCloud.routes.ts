import express, { Router } from "express";
// import { VerifyJWTToken } from "../middlewares/auth/userAuth";
import { reverseGeocode } from "../controller/googleCloud.controller";


const router: Router = express.Router();


//Protected routes for users
// router.use(VerifyJWTToken);

// fetch current address
router.route('/fetch-current-address').get(reverseGeocode);


export default router;