"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const question_controller_1 = require("../controller/question.controller");
const IP_middleware_1 = require("../middlewares/IP.middleware");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/')
    .post((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, question_controller_1.addQuestions)
    .get(question_controller_1.fetchQuestions);
// router.route('/:categoryId').get(fetchQuestionsCategorywise);
router.route('/q/:categoryId/:questionId')
    .get(question_controller_1.fetchSingleQuestion)
    .patch((0, userAuth_1.verifyUserType)(["SuperAdmin"]), IP_middleware_1.captureIPMiddleware, question_controller_1.updateSingleQuestion);
router.route('/q/:questionId')
    .delete((0, userAuth_1.verifyUserType)(["SuperAdmin"]), IP_middleware_1.captureIPMiddleware, question_controller_1.deleteSingleQuestion);
exports.default = router;
