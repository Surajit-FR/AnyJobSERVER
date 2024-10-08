import { Request, Response } from "express";
import QuestionModel from "../models/question.model";
import { sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";

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