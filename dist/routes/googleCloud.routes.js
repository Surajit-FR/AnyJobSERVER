"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import { VerifyJWTToken } from "../middlewares/auth/userAuth";
const googleCloud_controller_1 = require("../controller/googleCloud.controller");
const router = express_1.default.Router();
//Protected routes for users
// router.use(VerifyJWTToken);
// fetch current address
router.route('/fetch-current-address').get(googleCloud_controller_1.reverseGeocode);
//fetch coordinates
router.route('/fetch-coordinates').get(googleCloud_controller_1.getCoordinatesFromZip);
exports.default = router;
