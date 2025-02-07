"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const rating_controller_1 = require("../controller/rating.controller");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/')
    .post(rating_controller_1.addRating);
router.route('/r/:ratingId')
    .delete((0, userAuth_1.verifyUserType)(["SuperAdmin"]), rating_controller_1.deleteRating);
router.route('/add-app-rating')
    .post(rating_controller_1.addAppRating);
router.route('/fetch-app-rating-analysis')
    .get(rating_controller_1.fetchAppRatingAnalysis);
router.route('/fetch-app-rating')
    .get(rating_controller_1.fetchAppRating);
exports.default = router;
