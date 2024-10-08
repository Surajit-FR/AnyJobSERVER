import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import QuestionModel from "../models/question.model";
import { sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";

export const fetchQuestionsSubCategorywise = asyncHandler(async (req: CustomRequest, res: Response) => {
    const  categoryId  = req.query.categoryId as string;
    const  subCategoryId = req.params.subCategoryId;

    const results = await QuestionModel.aggregate([
        {
            $match: {
                categoryId: new mongoose.Types.ObjectId(categoryId),
                subCategoryId:new mongoose.Types.ObjectId(subCategoryId)
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
    return sendSuccessResponse(res, 200, results, "Questions retrieved successfully for the given Subcategory.");
});

