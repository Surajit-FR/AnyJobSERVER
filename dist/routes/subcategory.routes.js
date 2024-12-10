"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const multer_middleware_1 = require("../middlewares/multer.middleware");
const subcategory_controller_1 = require("../controller/subcategory.controller");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/').post(multer_middleware_1.upload.fields([
    { name: "subCategoryImage" }
]), (0, userAuth_1.verifyUserType)(['SuperAdmin']), subcategory_controller_1.addSubCategory);
router.route("/c/:SubCategoryId")
    .get(subcategory_controller_1.getSubCategorieById)
    .delete((0, userAuth_1.verifyUserType)(['SuperAdmin']), subcategory_controller_1.deleteSubCategory)
    .patch(multer_middleware_1.upload.fields([{ name: "subCategoryImage" }]), (0, userAuth_1.verifyUserType)(['SuperAdmin']), subcategory_controller_1.updateSubCategory);
router.route('/').get(subcategory_controller_1.getSubCategories);
exports.default = router;
