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
exports.deleteSpecificDerivedQuestionSet = exports.deleteSingleQuestion = exports.updateSingleQuestion = exports.fetchSingleQuestion = exports.fetchQuestions = exports.addQuestions = void 0;
const question_model_1 = __importDefault(require("../models/question.model"));
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const ApisErrors_1 = require("../utils/ApisErrors");
// addQuestions controller
exports.addQuestions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { categoryId, questionArray } = req.body;
    const parsedQuestionArray = typeof questionArray === "string"
        ? JSON.parse(questionArray)
        : questionArray;
    const saveQuestions = (questionData, categoryId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const optionsMap = new Map(Object.entries(questionData.options));
        const derivedQuestions = ((_a = questionData.derivedQuestions) === null || _a === void 0 ? void 0 : _a.map((derivedQuestion) => ({
            option: derivedQuestion.option,
            question: derivedQuestion.question,
            options: new Map(Object.entries(derivedQuestion.options)),
            derivedQuestions: derivedQuestion.derivedQuestions || [],
        }))) || [];
        const mainQuestion = yield question_model_1.default.create({
            categoryId,
            question: questionData.question,
            options: optionsMap,
            derivedQuestions,
        });
        return mainQuestion._id;
    });
    const questionIds = yield Promise.all(parsedQuestionArray.map((questionData) => saveQuestions(questionData, categoryId)));
    return (0, response_1.sendSuccessResponse)(res, 201, { questionIds }, "Questions added successfully.");
}));
// export const fetchQuestionsCategorywise = asyncHandler(async (req: Request, res: Response) => {
//     const { categoryId } = req.params;
//     let finalResult;
//     const results = await QuestionModel.aggregate([
//         {
//             $match: {
//                 isDeleted: false,
//                 categoryId: new mongoose.Types.ObjectId(categoryId)
//             }
//         },
//         {
//             $lookup: {
//                 from: "categories",
//                 foreignField: "_id",
//                 localField: "categoryId",
//                 as: "categoryId"
//             }
//         },
//         {
//             $unwind: {
//                 path: "$categoryId",
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         {
//             $project: {
//                 isDeleted: 0,
//                 __v: 0,
//                 'categoryId.isDeleted': 0,
//                 'categoryId.__v': 0,
//             }
//         },
//         {
//             $sort: {
//                 createdAt: 1
//             }
//         }
//     ]);
//     if (results.length) {
//         let category = results[0].categoryId;
//         const questions = results.map(question => ({
//             _id: question._id,
//             question: question.question,
//             options: question.options,
//             derivedQuestions: question.derivedQuestions,
//             createdAt: question.createdAt,
//             updatedAt: question.updatedAt
//         }));
//         finalResult = {
//             category: {
//                 _id: category._id,
//                 name: category.name,
//                 categoryImage: category.categoryImage,
//                 owner: category.owner,
//                 questions: questions
//             }
//         }
//     }
//     return sendSuccessResponse(res, 200, finalResult, "Questions retrieved successfully for the given Category.");
// });
// fetchQuestions controller
exports.fetchQuestions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = req.query.categoryId; // Get categoryId from query parameters
    const matchCriteria = {
        isDeleted: false,
    };
    // Add categoryId to match criteria if it exists
    if (categoryId) {
        matchCriteria.categoryId = new mongoose_1.default.Types.ObjectId(categoryId);
    }
    const results = yield question_model_1.default.aggregate([
        {
            $match: matchCriteria, // Use the built match criteria
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
        },
        {
            $unwind: {
                path: "$categoryId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                "categoryId.isDeleted": 0,
                "categoryId.__v": 0,
            },
        },
        {
            $sort: {
                createdAt: 1,
            },
        },
    ]);
    const groupedResults = {};
    results.forEach((question) => {
        const categoryKey = question.categoryId._id.toString();
        if (!groupedResults[categoryKey]) {
            groupedResults[categoryKey] = {
                _id: question.categoryId._id,
                name: question.categoryId.name,
                categoryImage: question.categoryId.categoryImage,
                owner: question.categoryId.owner,
                questions: [],
            };
        }
        groupedResults[categoryKey].questions.push({
            _id: question._id,
            question: question.question,
            options: question.options,
            derivedQuestions: question.derivedQuestions,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt,
        });
    });
    // Convert groupedResults object into an array
    const finalResults = Object.values(groupedResults);
    return (0, response_1.sendSuccessResponse)(res, 200, finalResults, "Questions retrieved successfully.");
}));
// fetchSingleQuestion controller
exports.fetchSingleQuestion = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { categoryId, questionId } = req.params;
    let finalResult;
    if (!categoryId && !questionId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Both CategoryId ID and Question ID are required."));
    }
    const results = yield question_model_1.default.aggregate([
        {
            $match: {
                categoryId: new mongoose_1.default.Types.ObjectId(categoryId),
                _id: new mongoose_1.default.Types.ObjectId(questionId),
                isDeleted: false,
            },
        },
        {
            $lookup: {
                from: "categories",
                foreignField: "_id",
                localField: "categoryId",
                as: "categoryId",
            },
        },
        {
            $unwind: {
                path: "$categoryId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
                "categoryId.isDeleted": 0,
                "categoryId.__v": 0,
            },
        },
    ]);
    if (!results) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Question not found."));
    }
    if (results.length) {
        let category = results[0].categoryId;
        const questions = results.map((question) => ({
            _id: question._id,
            question: question.question,
            options: question.options,
            derivedQuestions: question.derivedQuestions,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt,
        }));
        finalResult = {
            _id: category._id,
            name: category.name,
            categoryImage: category.categoryImage,
            owner: category.owner,
            questions: questions,
        };
    }
    return (0, response_1.sendSuccessResponse)(res, 200, finalResult, "Questions retrieved successfully .");
}));
// updateSingleQuestion controller
exports.updateSingleQuestion = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { categoryId, questionId } = req.params;
    const updates = req.body;
    if (!categoryId && !questionId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Both Category ID and Question ID are required."));
    }
    // Find and update the question by subcategoryId and questionId
    const updatedQuestion = yield question_model_1.default.findOneAndUpdate({
        _id: new mongoose_1.default.Types.ObjectId(questionId),
        categoryId: new mongoose_1.default.Types.ObjectId(categoryId),
    }, { $set: updates }, { new: true }).select("-isDeleted -__v");
    if (!updatedQuestion) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Question not found."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, updatedQuestion, "Question updated successfully.");
}));
// deleteSingleQuestion controller
exports.deleteSingleQuestion = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { questionId } = req.params;
    if (!questionId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Question ID are required."));
    }
    // Find and update the question by subcategoryId and questionId
    const deletedQuestion = yield question_model_1.default.findByIdAndDelete({
        _id: new mongoose_1.default.Types.ObjectId(questionId),
    });
    if (!deletedQuestion) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Question not found."));
    }
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Question deleted successfully.");
}));
exports.deleteSpecificDerivedQuestionSet = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { questionId, derivedQuestionId } = req.body;
    if (!questionId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Question ID is required."));
    }
    if (!derivedQuestionId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Derived question ID is required."));
    }
    const updatedQuestionSet = yield question_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(questionId) }, {
        $pull: {
            derivedQuestions: {
                _id: new mongoose_1.default.Types.ObjectId(derivedQuestionId),
            },
        },
    }, { new: true });
    return (0, response_1.sendSuccessResponse)(res, 200, {}, 
    //   updatedQuestionSet,
    "Derived question deleted successfully.");
}));
