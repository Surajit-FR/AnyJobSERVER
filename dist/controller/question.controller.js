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
exports.fetchQuestionsSubCategorywise = void 0;
const question_model_1 = __importDefault(require("../models/question.model"));
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
exports.fetchQuestionsSubCategorywise = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = req.query.categoryId;
    const subCategoryId = req.params.subCategoryId;
    const matchStage = {};
    if (subCategoryId) {
        matchStage.subCategoryId = new mongoose_1.default.Types.ObjectId(subCategoryId);
    }
    if (categoryId) {
        matchStage.categoryId = new mongoose_1.default.Types.ObjectId(categoryId);
    }
    const results = yield question_model_1.default.aggregate([
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
            $lookup: {
                from: "subcategories",
                foreignField: "_id",
                localField: "subCategoryId",
                as: "subCategoryId"
            }
        },
        {
            $unwind: {
                path: "$subCategoryId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                'categoryId.isDeleted': 0,
                'categoryId.__v': 0,
                'subCategoryId.isDeleted': 0,
                'subCategoryId.__v': 0
            }
        },
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Questions retrieved successfully for the given Subcategory.");
}));
