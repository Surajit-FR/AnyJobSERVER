"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const otp_controller_1 = require("../controller/otp.controller");
const rateLimiter_middleware_1 = require("../middlewares/rateLimiter.middleware");
const router = express_1.default.Router();
router.route('/demo/api/v1/send').post(rateLimiter_middleware_1.rateLimiter, otp_controller_1.sendOTP);
router.route('/demo/api/v1/verify').post(rateLimiter_middleware_1.rateLimiter, otp_controller_1.verifyOTP);
exports.default = router;
