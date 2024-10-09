import { Request, Response } from "express";
import QuestionModel from "../models/question.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApisErrors";

export const fetchQuestionsSubCategorywise = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.query.categoryId as string;
    const subCategoryId = req.params.subCategoryId;

    const matchStage: any = {};

    if (subCategoryId) {
        matchStage.subCategoryId = new mongoose.Types.ObjectId(subCategoryId);
    }

    if (categoryId) {
        matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const results = await QuestionModel.aggregate([
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
    ])
    return sendSuccessResponse(res, 200, results, "Questions retrieved successfully for the given Subcategory.");
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