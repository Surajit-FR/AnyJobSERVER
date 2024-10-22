import { Request, Response } from "express";
import QuestionModel from "../models/question.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApisErrors";
import { CustomRequest } from "../../types/commonType";
import { IAddQuestionPayloadReq } from "../../types/requests_responseType";
import { IQuestion } from "../../types/schemaTypes";

export const addQuestions = asyncHandler(async (req: CustomRequest, res: Response) => {
    console.log("----");

    const { categoryId, questionArray }: IAddQuestionPayloadReq = req.body;

    // Parse questionArray if it's a string
    const parsedQuestionArray = typeof questionArray === 'string' ? JSON.parse(questionArray) : questionArray;

    const saveQuestions = async (questionData: any, categoryId: mongoose.Types.ObjectId) => {
        // Convert the options object into a Map for the main question
        const optionsMap = new Map<string, string>(Object.entries(questionData.options));

        // Process derived questions to convert their options to Map as well
        const derivedQuestions = questionData.derivedQuestions?.map((derivedQuestion: any) => ({
            option: derivedQuestion.option,
            question: derivedQuestion.question,
            options: new Map<string, string>(Object.entries(derivedQuestion.options)), // Convert derived question options to Map
            derivedQuestions: derivedQuestion.derivedQuestions || []
        })) || [];

        // Save the main question along with its derived questions
        const mainQuestion = await QuestionModel.create({
            categoryId,
            question: questionData.question,
            options: optionsMap, // Use the converted Map here
            derivedQuestions // Use the processed derived questions
        });
        return mainQuestion._id;
    };

    // Iterate over the questionArray and save each question with nested derived questions
    const questionIds = await Promise.all(parsedQuestionArray.map((questionData: IQuestion) =>
        saveQuestions(questionData, categoryId as mongoose.Types.ObjectId)
    ));



    return sendSuccessResponse(res, 201, { questionIds }, "Questions added successfully.");
});

export const fetchQuestionsCategorywise = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    let finalResult;

    const results = await QuestionModel.aggregate([
        {
            $match: {
                isDeleted: false,
                categoryId: new mongoose.Types.ObjectId(categoryId)
            }
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
                'categoryId.__v': 0,
            }
        },
        {
            $sort: {
                createdAt: 1
            }
        }
    ]);
    if (results.length) {
        let category = results[0].categoryId;
        const questions = results.map(question => ({
            _id: question._id,
            question: question.question,
            options: question.options,
            derivedQuestions: question.derivedQuestions,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt
        }));
        finalResult = {
            category: {
                _id: category._id,
                name: category.name,
                categoryImage: category.categoryImage,
                owner: category.owner,
                questions: questions
            }

        }
    }
    return sendSuccessResponse(res, 200, finalResult, "Questions retrieved successfully for the given Category.");
});

export const fetchQuestions = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.query.categoryId; // Get categoryId from query parameters

    const matchCriteria: { isDeleted: boolean; categoryId?: mongoose.Types.ObjectId } = {
        isDeleted: false
    };

    // Add categoryId to match criteria if it exists
    if (categoryId) {
        matchCriteria.categoryId = new mongoose.Types.ObjectId(categoryId as string);
    }

    const results = await QuestionModel.aggregate([
        {
            $match: matchCriteria // Use the built match criteria
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
                'categoryId.__v': 0,
            }
        },
        {
            $sort: {
                createdAt: 1
            }
        }
    ]);

    const groupedResults: Record<string, any> = {};

    results.forEach((question: any) => {
        const categoryKey = question.categoryId._id.toString();

        if (!groupedResults[categoryKey]) {
            groupedResults[categoryKey] = {
                _id: question.categoryId._id,
                name: question.categoryId.name,
                categoryImage: question.categoryId.categoryImage,
                owner: question.categoryId.owner,
                questions: []
            };
        }

        groupedResults[categoryKey].questions.push({
            _id: question._id,
            question: question.question,
            options: question.options,
            derivedQuestions: question.derivedQuestions,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt
        });
    });

    // Convert groupedResults object into an array
    const finalResults = Object.values(groupedResults);

    return sendSuccessResponse(res, 200, finalResults, "Questions retrieved successfully for the given Category.");
});

export const fetchSingleQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { subcategoryId, questionId } = req.params;

    if (!subcategoryId && !questionId) {
        return sendErrorResponse(res, new ApiError(400, "Both SubCategory ID and Question ID are required."));
    }

    const question = await QuestionModel.aggregate([
        {
            $match: {
                subCategoryId: new mongoose.Types.ObjectId(subcategoryId),
                _id: new mongoose.Types.ObjectId(questionId),
                isDeleted: false
            }
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
    ])

    if (!question) {
        return sendErrorResponse(res, new ApiError(404, "Question not found."));
    }

    // Return the found question
    return sendSuccessResponse(res, 200, question, "Question retrieved successfully.");

});

export const updateSingleQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { subcategoryId, questionId } = req.params;
    const updates = req.body;

    if (!subcategoryId && !questionId) {
        return sendErrorResponse(res, new ApiError(400, "Both SubCategory ID and Question ID are required."));
    }

    // Find and update the question by subcategoryId and questionId
    const updatedQuestion = await QuestionModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(questionId), subCategoryId: new mongoose.Types.ObjectId(subcategoryId), },
        { $set: updates },
        { new: true, }
    );

    if (!updatedQuestion) {
        return sendErrorResponse(res, new ApiError(404, "Question not found."));
    }

    return sendSuccessResponse(res, 200, updatedQuestion, "Question updated successfully.");
});