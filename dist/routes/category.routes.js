"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("../controller/category.controller");
const modelAuth_1 = __importDefault(require("../middlewares/auth/modelAuth"));
const category_validate_1 = __importDefault(require("../models/validator/category.validate"));
const multer_middleware_1 = require("../middlewares/multer.middleware");
const userAuth_1 = require("../middlewares/auth/userAuth");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken); // Apply SuperAdmin verifyJWT middleware
router.route('/').post(multer_middleware_1.upload.fields([
    { name: "categoryImage" },
]), [(0, modelAuth_1.default)(category_validate_1.default)], (0, userAuth_1.verifyUserType)(['SuperAdmin']), category_controller_1.addCategory);
router.route("/c/:CategoryId")
    .get(category_controller_1.getCategorieById)
    .delete((0, userAuth_1.verifyUserType)(['SuperAdmin']), category_controller_1.deleteCategory)
    .put((0, userAuth_1.verifyUserType)(['SuperAdmin']), multer_middleware_1.upload.fields([
    { name: "categoryImage" },
]), category_controller_1.updateCategory);
router.route('/').get(category_controller_1.getCategories);
exports.default = router;