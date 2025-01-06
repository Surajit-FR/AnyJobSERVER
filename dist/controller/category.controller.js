"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCategories = exports.getCategorieById = exports.deleteCategory = exports.updateCategory = exports.getCategories = exports.addCategory = void 0;
;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = require("../utils/asyncHandler");
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const category_model_1 = __importDefault(require("../models/category.model"));
const subcategory_model_1 = __importDefault(require("../models/subcategory.model"));
const question_model_1 = __importDefault(require("../models/question.model"));
const cloudinary_1 = require("../utils/cloudinary");
const multer_middleware_1 = require("../middlewares/multer.middleware");
// addCategory controller
exports.addCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name } = req.body;
    const trimmedName = name.trim();
    const existingCategory = yield category_model_1.default.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existingCategory) {
        // Delete the local image if it exists
        const categoryImageFile = req.files;
        const catImgFile = (categoryImageFile === null || categoryImageFile === void 0 ? void 0 : categoryImageFile.categoryImage) ? categoryImageFile.categoryImage[0] : undefined;
        if (catImgFile) {
            (0, multer_middleware_1.deleteUploadedFiles)({ categoryImage: categoryImageFile === null || categoryImageFile === void 0 ? void 0 : categoryImageFile.categoryImage });
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category with the same name already exists."));
    }
    const categoryImageFile = req.files;
    if (!categoryImageFile) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
    }
    ;
    const catImgFile = categoryImageFile.categoryImage ? categoryImageFile.categoryImage[0] : undefined;
    const catImg = yield (0, cloudinary_1.uploadOnCloudinary)(catImgFile === null || catImgFile === void 0 ? void 0 : catImgFile.path);
    const newCategory = yield category_model_1.default.create({
        name: trimmedName,
        categoryImage: catImg === null || catImg === void 0 ? void 0 : catImg.secure_url,
        owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
    });
    if (!newCategory) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while adding the Category."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, newCategory, "Category added Successfully");
}));
//fetch all category
exports.getCategories = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield category_model_1.default.aggregate([
        {
            $match: { isDeleted: false }
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Category retrieved successfully.");
}));
// updateCategory controller
exports.updateCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { CategoryId } = req.params;
    const { name } = req.body;
    if (!CategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category ID is required."));
    }
    ;
    const trimmedName = name.trim();
    const existingCategory = yield category_model_1.default.findOne({
        _id: { $ne: new mongoose_1.default.Types.ObjectId(CategoryId) },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });
    if (existingCategory) {
        const categoryImageFile = req.files;
        const catImgFile = (categoryImageFile === null || categoryImageFile === void 0 ? void 0 : categoryImageFile.categoryImage) ? categoryImageFile.categoryImage[0] : undefined;
        if (catImgFile) {
            (0, multer_middleware_1.deleteUploadedFiles)({ categoryImage: categoryImageFile === null || categoryImageFile === void 0 ? void 0 : categoryImageFile.categoryImage });
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category with the same name already exists."));
    }
    const categoryImageFile = req.files;
    const catImgFile = (categoryImageFile === null || categoryImageFile === void 0 ? void 0 : categoryImageFile.categoryImage) ? categoryImageFile.categoryImage[0] : undefined;
    let catImgUrl;
    if (catImgFile) {
        const catImg = yield (0, cloudinary_1.uploadOnCloudinary)(catImgFile.path);
        catImgUrl = catImg === null || catImg === void 0 ? void 0 : catImg.secure_url;
    }
    const updatedCategory = yield category_model_1.default.findByIdAndUpdate(new mongoose_1.default.Types.ObjectId(CategoryId), {
        $set: Object.assign({ name: trimmedName }, (catImgUrl && { categoryImage: catImgUrl }) // Only update image if uploaded
        ),
    }, { new: true });
    if (!updatedCategory) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Category not found for updating."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedCategory, "Category updated Successfully");
}));
// deleteCategory controller
exports.deleteCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { CategoryId } = req.params;
    if (!CategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category ID is required."));
    }
    ;
    const categoryToDelete = yield category_model_1.default.findById(CategoryId);
    if (!categoryToDelete) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Category not found for deleting."));
    }
    ;
    const imageUrls = [];
    if (categoryToDelete.categoryImage)
        imageUrls.push(categoryToDelete.categoryImage);
    const subcategories = yield subcategory_model_1.default.find({ CategoryId });
    subcategories.forEach((subCategory) => {
        if (subCategory.subCategoryImage)
            imageUrls.push(subCategory.subCategoryImage);
    });
    yield question_model_1.default.deleteMany({
        $or: [
            { categoryId: CategoryId },
        ]
    });
    yield subcategory_model_1.default.deleteMany({ categoryId: CategoryId });
    yield category_model_1.default.findByIdAndDelete(CategoryId);
    const deleteImages = imageUrls.map((url) => {
        (0, cloudinary_1.deleteFromCloudinary)(url);
    });
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Category and its related subcategories and questions deleted successfully");
}));
//fetch category by id
exports.getCategorieById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { CategoryId } = req.params;
    if (!CategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category ID is required."));
    }
    ;
    const categoryToFetch = yield category_model_1.default.findById(CategoryId);
    if (!categoryToFetch) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "Category not found."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, categoryToFetch, "Category retrieved successfully.");
}));
exports.searchCategories = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serachKey } = req.body;
    const categoryData = yield category_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                name: { $regex: serachKey, $options: "i" }
            }
        },
        {
            $project: {
                isDeleted: 0,
                owner: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, categoryData, "Category retrieved successfully.");
}));
