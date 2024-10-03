import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import SubCategoryModel from "../models/subcategory.model";
import QuestionModel from "../models/question.model";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose, { ObjectId } from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { IAddSubCategoryPayloadReq, IQuestion } from "../../types/requests_responseType";

// addSubCategory controller
export const addSubCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId, name, subCategoryImage, questionArray }: IAddSubCategoryPayloadReq = req.body;

    // Trim and convert name to lowercase
    const trimmedName = name.trim().toLowerCase();

    // Check if a subcategory with the same name already exists (case-insensitive)
    const existingCategory = await SubCategoryModel.findOne({ name: trimmedName });
    if (existingCategory) {
        return sendErrorResponse(res, new ApiError(400, "Subcategory with the same name already exists."));
    }

    //subcategory image upload in multer
    const subCategoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
    console.log(subCategoryImageFile);
    if (!subCategoryImageFile) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    };
    const subCatImgFile = subCategoryImageFile.subCategoryImage ? subCategoryImageFile.subCategoryImage[0] : undefined;
    // Upload files to Cloudinary
    const subCatImg = await uploadOnCloudinary(subCatImgFile?.path as string);

    // Create the subcategory
    const newSubCategory = await SubCategoryModel.create({
        categoryId,
        name: trimmedName,
        subCategoryImage: subCatImg?.url,
        owner: req.user?._id,
        questionArray
    });

    if (!newSubCategory) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while adding the Subcategory."));
    }

    // Function to save main and derived questions recursively
    const saveQuestions = async (questionData: any, subCategoryId: mongoose.Types.ObjectId) => {
        // Save the main question along with its derived questions
        const mainQuestion = await QuestionModel.create({
            categoryId,
            subCategoryId,
            question: questionData.question,
            options: questionData.options,
            derivedQuestions: questionData.derivedQuestions || [] // Derived questions nested inside
        });

        return mainQuestion._id;
    };
    return sendSuccessResponse(res, 201, newSubCategory, "Subcategory and questions added successfully.");
});

//fetch categorywise subcategory 
export const getSubCategories = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { categoryId } = req.params;
    const results = await SubCategoryModel.aggregate([
        {
            $match: { categoryId: new mongoose.Types.ObjectId(categoryId) }
        },
        { $sort: { createdAt: -1 } },
    ]);
    console.log(results);

    return sendSuccessResponse(res, 200, results, "SubCategory retrieved successfully.");
});

// updateCategory controller
export const updateSubCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { SubCategoryId } = req.params;
    const { name }: { name: string } = req.body;

    if (!SubCategoryId) {
        return sendErrorResponse(res, new ApiError(400, "SubCategory ID is required."));
    };

    const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(
        SubCategoryId,
        {
            $set: {
                name
            }
        }, { new: true }
    );

    if (!updatedSubCategory) {
        return sendErrorResponse(res, new ApiError(404, "Category not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedSubCategory, "Category updated Successfully");
});

// deleteCategory controller
export const deleteSubCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
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

//fetch category by id
export const getSubCategorieById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { SubCategoryId } = req.params;
    if (!SubCategoryId) {
        return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    };

    //  Find the category to delete
    const SubcategoryToFetch = await SubCategoryModel.findById(SubCategoryId);
    if (!SubcategoryToFetch) {
        return sendErrorResponse(res, new ApiError(404, "SubCategory not found."));
    };

    // console.log(results);
    // Return the videos along with pagination details
    return sendSuccessResponse(res, 200, SubcategoryToFetch, "SubCategory retrieved successfully.");
});