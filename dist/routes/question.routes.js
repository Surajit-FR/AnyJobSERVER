"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const question_controller_1 = require("../controller/question.controller");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/:subCategoryId').get(question_controller_1.fetchQuestionsSubCategorywise);
exports.default = router;
