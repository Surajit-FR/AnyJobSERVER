import { Request, Response } from "express";
import { CustomRequest } from "../../types/commonType";
import SubCategoryModel from "../models/subcategory.model";
import QuestionModel from "../models/question.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { IAddSubCategoryPayloadReq, IQuestion } from "../../types/requests_responseType";
import fs from 'fs';

// addSubCategory controller
export const addSubCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId, name, questionArray }: IAddSubCategoryPayloadReq = req.body;

    // Parse questionArray if it's a string
    const parsedQuestionArray = typeof questionArray === 'string' ? JSON.parse(questionArray) : questionArray;

    const trimmedName = name.trim();

    const existingSubCategory = await SubCategoryModel.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existingSubCategory) {
        const subCategoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        const subcatImgFile = subCategoryImageFile?.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;

        if (subcatImgFile) {
            fs.unlink(subcatImgFile.path, (err) => {
                if (err) {
                    console.error("Error deleting local image:", err);
                }
            });
        }

        return sendErrorResponse(res, new ApiError(400, "SubCategory with the same name already exists."));
    }

    const subCategoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
    if (!subCategoryImageFile) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    }
    const subCatImgFile = subCategoryImageFile.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;
    const subCatImg = await uploadOnCloudinary(subCatImgFile?.path as string);

    const newSubCategory = await SubCategoryModel.create({
        categoryId,
        name: trimmedName,
        subCategoryImage: subCatImg?.url,
        owner: req.user?._id,
        questionArray: parsedQuestionArray // Use the parsed question array
    });

    if (!newSubCategory) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while adding the Subcategory."));
    }

    const saveQuestions = async (questionData: any, subCategoryId: mongoose.Types.ObjectId) => {
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
            subCategoryId,
            question: questionData.question,
            options: optionsMap, // Use the converted Map here
            derivedQuestions // Use the processed derived questions
        });
        return mainQuestion._id;
    };

    // Iterate over the questionArray and save each question with nested derived questions
    const questionIds = await Promise.all(parsedQuestionArray.map((questionData: IQuestion) =>
        saveQuestions(questionData, newSubCategory._id as unknown as mongoose.Types.ObjectId)
    ));

    return sendSuccessResponse(res, 201, newSubCategory, "Subcategory and questions added successfully.");
});

//fetch categorywise subcategory 
export const getSubCategories = asyncHandler(async (req: Request, res: Response) => {

    const categoryId = req.query.categoryId as string;
    const matchStage: any = { isDeleted: false };

    if (categoryId) {
        matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    const results = await SubCategoryModel.aggregate([
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

    return sendSuccessResponse(res, 200, results, "SubCategory retrieved successfully.");
});

// update SubCategory controller
export const updateSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { SubCategoryId } = req.params;
    const { name }: { name: string } = req.body;

    if (!SubCategoryId) {
        return sendErrorResponse(res, new ApiError(400, "SubCategory ID is required."));
    };
    const trimmedName = name.trim();

    const existingSubCategory = await SubCategoryModel.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(SubCategoryId) },  
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });
    if (existingSubCategory) {
        const subCategoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
        const subCategoryImage = subCategoryImageFile?.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;

        if (subCategoryImage) {
            fs.unlink(subCategoryImage.path, (err) => {
                if (err) {
                    console.error("Error deleting local image:", err);
                }
            });
        }

        return sendErrorResponse(res, new ApiError(400, "SubCategory with the same name already exists."));
    }

    const subCategoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
    if (!subCategoryImageFile) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    };
    const subCatImgFile = subCategoryImageFile.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;
    const subCatImg = await uploadOnCloudinary(subCatImgFile?.path as string);

    const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(
        SubCategoryId,
        {
            $set: {
                name: trimmedName,
                subCategoryImage: subCatImg?.url
            }
        }, { new: true }
    );

    if (!updatedSubCategory) {
        return sendErrorResponse(res, new ApiError(404, "SubCategory not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedSubCategory, "SubCategory updated Successfully");
});

// deleteCategory controller
export const deleteSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { SubCategoryId } = req.params;
    if (!SubCategoryId) {
        return sendErrorResponse(res, new ApiError(400, "SubCategory ID is required."));
    };

    //  Delete all questions related to this category and its subcategories
    await QuestionModel.deleteMany({
        $or: [
            { subCategoryId: SubCategoryId },
        ]
    });

    //Find SubCategories 
    const subcategory = await SubCategoryModel.findOne({ SubCategoryId })
    if (subcategory && subcategory.subCategoryImage) {
        const deleteSubCatImgFromCloudinary = await deleteFromCloudinary(subcategory.subCategoryImage)
    }

    //  Remove the SubCategory from the database
    const deletedSubCategory = await SubCategoryModel.findByIdAndDelete(SubCategoryId);

    if (!deletedSubCategory) {
        return sendErrorResponse(res, new ApiError(404, "SubCategory not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "SubCategory and its related questions deleted successfully");
});

//fetch subcategory by id
export const getSubCategorieById = asyncHandler(async (req: Request, res: Response) => {
    const { SubCategoryId } = req.params;
    if (!SubCategoryId) {
        return sendErrorResponse(res, new ApiError(400, "SubCategory ID is required."));
    };

    const results = await SubCategoryModel.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(SubCategoryId) }
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
        return sendErrorResponse(res, new ApiError(404, "SubCategory not found."));
    }

    // Return the retrieved SubCategory
    return sendSuccessResponse(res, 200, results[0], "SubCategory retrieved successfully.");
});
