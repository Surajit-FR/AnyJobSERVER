"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const question_controller_1 = require("../controller/question.controller");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/:subCategoryId').get(question_controller_1.fetchQuestionsSubCategorywise);
router.route('/:subcategoryId/:questionId').get(question_controller_1.fetchSingleQuestion);
router.route('/:subcategoryId/:questionId').patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), question_controller_1.updateSingleQuestion);
exports.default = router;
