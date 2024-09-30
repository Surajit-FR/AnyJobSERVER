import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import QuestionModel from "../models/question.model";
import { sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";

export const fetchQuestionsSubCategorySubCategorywise = asyncHandler(async (req:CustomRequest,res:Response)=>{
    const {categoryId,subCategoryId } = req.params;

    const results = await QuestionModel.aggregate([
        {
            $match:{
                categoryId:new mongoose.Types.ObjectId(categoryId),
                subCategoryId:new mongoose.Types.ObjectId(subCategoryId),
            }
        },       
    ])
    return sendSuccessResponse(res, 200, {
        results,

    }, "Questions retrieved successfully for the given Subcategory.");
});

