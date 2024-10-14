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
exports.getSubCategorieById = exports.deleteSubCategory = exports.updateSubCategory = exports.getSubCategories = exports.addSubCategory = void 0;
const subcategory_model_1 = __importDefault(require("../models/subcategory.model"));
const question_model_1 = __importDefault(require("../models/question.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("../utils/cloudinary");
const fs_1 = __importDefault(require("fs"));
// addSubCategory controller
exports.addSubCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { categoryId, name, questionArray } = req.body;
    // Parse questionArray if it's a string
    const parsedQuestionArray = typeof questionArray === 'string' ? JSON.parse(questionArray) : questionArray;
    const trimmedName = name.trim();
    const existingSubCategory = yield subcategory_model_1.default.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existingSubCategory) {
        const subCategoryImageFile = req.files;
        const subcatImgFile = (subCategoryImageFile === null || subCategoryImageFile === void 0 ? void 0 : subCategoryImageFile.subCategoryImage) ? subCategoryImageFile.subCategoryImage[0] : undefined;
        if (subcatImgFile) {
            fs_1.default.unlink(subcatImgFile.path, (err) => {
                if (err) {
                    console.error("Error deleting local image:", err);
                }
            });
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "SubCategory with the same name already exists."));
    }
    const subCategoryImageFile = req.files;
    if (!subCategoryImageFile) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
    }
    const subCatImgFile = subCategoryImageFile.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;
    const subCatImg = yield (0, cloudinary_1.uploadOnCloudinary)(subCatImgFile === null || subCatImgFile === void 0 ? void 0 : subCatImgFile.path);
    const newSubCategory = yield subcategory_model_1.default.create({
        categoryId,
        name: trimmedName,
        subCategoryImage: subCatImg === null || subCatImg === void 0 ? void 0 : subCatImg.url,
        owner: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
        questionArray: parsedQuestionArray // Use the parsed question array
    });
    if (!newSubCategory) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while adding the Subcategory."));
    }
    const saveQuestions = (questionData, subCategoryId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Convert the options object into a Map for the main question
        const optionsMap = new Map(Object.entries(questionData.options));
        // Process derived questions to convert their options to Map as well
        const derivedQuestions = ((_a = questionData.derivedQuestions) === null || _a === void 0 ? void 0 : _a.map((derivedQuestion) => ({
            option: derivedQuestion.option,
            question: derivedQuestion.question,
            options: new Map(Object.entries(derivedQuestion.options)), // Convert derived question options to Map
            derivedQuestions: derivedQuestion.derivedQuestions || []
        }))) || [];
        // Save the main question along with its derived questions
        const mainQuestion = yield question_model_1.default.create({
            categoryId,
            subCategoryId,
            question: questionData.question,
            options: optionsMap, // Use the converted Map here
            derivedQuestions // Use the processed derived questions
        });
        return mainQuestion._id;
    });
    // Iterate over the questionArray and save each question with nested derived questions
    const questionIds = yield Promise.all(parsedQuestionArray.map((questionData) => saveQuestions(questionData, newSubCategory._id)));
    return (0, response_1.sendSuccessResponse)(res, 201, newSubCategory, "Subcategory and questions added successfully.");
}));
//fetch categorywise subcategory 
exports.getSubCategories = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = req.query.categoryId;
    const matchStage = { isDeleted: false };
    if (categoryId) {
        matchStage.categoryId = new mongoose_1.default.Types.ObjectId(categoryId);
    }
    const results = yield subcategory_model_1.default.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId"
            }
        },
        {
            $unwind: {
                path: "$categoryId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                'categoryId.isDeleted': 0,
                'categoryId.__v': 0
            }
        },
        { $sort: { createdAt: -1 } },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "SubCategory retrieved successfully.");
}));
// update SubCategory controller
exports.updateSubCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { SubCategoryId } = req.params;
    const { name } = req.body;
    if (!SubCategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "SubCategory ID is required."));
    }
    ;
    const trimmedName = name.trim();
    const existingSubCategory = yield subcategory_model_1.default.findOne({
        _id: { $ne: new mongoose_1.default.Types.ObjectId(SubCategoryId) },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });
    if (existingSubCategory) {
        const subCategoryImageFile = req.files;
        const subCategoryImage = (subCategoryImageFile === null || subCategoryImageFile === void 0 ? void 0 : subCategoryImageFile.subCategoryImage) ? subCategoryImageFile.subCategoryImage[0] : undefined;
        if (subCategoryImage) {
            fs_1.default.unlink(subCategoryImage.path, (err) => {
                if (err) {
                    console.error("Error deleting local image:", err);
                }
            });
        }
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "SubCategory with the same name already exists."));
    }
    const subCategoryImageFile = req.files;
    if (!subCategoryImageFile) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No files were uploaded"));
    }
    ;
    const subCatImgFile = subCategoryImageFile.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;
    const subCatImg = yield (0, cloudinary_1.uploadOnCloudinary)(subCatImgFile === null || subCatImgFile === void 0 ? void 0 : subCatImgFile.path);
    const updatedSubCategory = yield subcategory_model_1.default.findByIdAndUpdate(SubCategoryId, {
        $set: {
            name: trimmedName,
            subCategoryImage: subCatImg === null || subCatImg === void 0 ? void 0 : subCatImg.url
        }
    }, { new: true });
    if (!updatedSubCategory) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "SubCategory not found for updating."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedSubCategory, "SubCategory updated Successfully");
}));
// deleteCategory controller
exports.deleteSubCategory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { SubCategoryId } = req.params;
    if (!SubCategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "SubCategory ID is required."));
    }
    ;
    //  Delete all questions related to this category and its subcategories
    yield question_model_1.default.deleteMany({
        $or: [
            { subCategoryId: SubCategoryId },
        ]
    });
    //Find SubCategories 
    const subcategory = yield subcategory_model_1.default.findOne({ SubCategoryId });
    if (subcategory && subcategory.subCategoryImage) {
        const deleteSubCatImgFromCloudinary = yield (0, cloudinary_1.deleteFromCloudinary)(subcategory.subCategoryImage);
    }
    //  Remove the SubCategory from the database
    const deletedSubCategory = yield subcategory_model_1.default.findByIdAndDelete(SubCategoryId);
    if (!deletedSubCategory) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "SubCategory not found for deleting."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "SubCategory and its related questions deleted successfully");
}));
//fetch subcategory by id
exports.getSubCategorieById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { SubCategoryId } = req.params;
    if (!SubCategoryId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "SubCategory ID is required."));
    }
    ;
    const results = yield subcategory_model_1.default.aggregate([
        {
            $match: { _id: new mongoose_1.default.Types.ObjectId(SubCategoryId) }
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryId"
            }
        },
        {
            $unwind: {
                path: "$categoryId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                'categoryId.isDeleted': 0,
                'categoryId.__v': 0
            }
        }
    ]);
    // Check if the SubCategory was found
    if (!results || results.length === 0) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(404, "SubCategory not found."));
    }
    // Return the retrieved SubCategory
    return (0, response_1.sendSuccessResponse)(res, 200, results[0], "SubCategory retrieved successfully.");
}));
