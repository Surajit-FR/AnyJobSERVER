import { Response } from "express";;
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CategoryModel from "../models/category.model";
import SubCategoryModel from "../models/subcategory.model";
import QuestionModel from "../models/question.model";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { IAddCategoryPayloadReq } from "../../types/requests_responseType";


// addCategory controller
export const addCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { name, categoryImage }: IAddCategoryPayloadReq = req.body;

    // Trim and convert name to lowercase
    const trimmedName = name.trim().toLowerCase();
    // Check if a category with the same name already exists (case-insensitive)
    const existingCategory = await CategoryModel.findOne({ name: trimmedName });
    if (existingCategory) {
        return sendErrorResponse(res, new ApiError(400, "Category with the same name already exists."));
    };

    const categoryImageFile = req.files as { [key: string]: Express.Multer.File[] } | undefined;
    if (!categoryImageFile) {
        return sendErrorResponse(res, new ApiError(400, "No files were uploaded"));
    };

    const catImgFile = categoryImageFile.categoryImage ? categoryImageFile.categoryImage[0] : undefined;

    // console.log(catImgFile);
    // Upload files to Cloudinary
    const catImg = await uploadOnCloudinary(catImgFile?.path as string);
    // console.log(catImg);

    const newCategory = await CategoryModel.create({
        name: trimmedName,
        categoryImage: catImg?.url,
        owner: req.user?._id,
    });

    if (!newCategory) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while adding the Category."));
    };

    return sendSuccessResponse(res, 201, newCategory, "Category added Successfully");
});

//fetch all category
export const getCategories = asyncHandler(async (req: CustomRequest, res: Response) => {

    const results = await CategoryModel.aggregate([
        {
            $match: { isDeleted: false }
        },
        { $sort: { createdAt: -1 } },
    ]);
    // console.log(results);
    // Return the videos along with pagination details
    return sendSuccessResponse(res, 200, results, "Category retrieved successfully.");
});

// updateCategory controller
export const updateCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { CategoryId } = req.params;
    const { name, categoryImage }: { name: string, categoryImage: string } = req.body;
    console.log(req.params);


    if (!CategoryId) {
        return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    };

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(CategoryId) },
        {
            $set: {
                name,
                categoryImage
            }
        }, { new: true }
    );

    if (!updatedCategory) {
        return sendErrorResponse(res, new ApiError(404, "Category not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedCategory, "Category updated Successfully");
});

// deleteCategory controller
export const deleteCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { CategoryId } = req.params;
    if (!CategoryId) {
        return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    };

    //  Find the category to delete
    const categoryToDelete = await CategoryModel.findById(CategoryId);
    if (!categoryToDelete) {
        return sendErrorResponse(res, new ApiError(404, "Category not found for deleting."));
    };
    const imageUrls = [];
    // Collect image from category
    if (categoryToDelete.categoryImage) imageUrls.push(categoryToDelete.categoryImage);

    //Find SubCategories 
    const subcategories = await SubCategoryModel.find({ CategoryId })
    // Collect images from subcategories
    subcategories.forEach((subCategory) => {
        if (subCategory.subCategoryImage) imageUrls.push(subCategory.subCategoryImage);
    });

    //  Delete all questions related to this category and its subcategories
    await QuestionModel.deleteMany({
        $or: [
            { categoryId: CategoryId },  // Questions directly related to the main category
        ]
    });

    await SubCategoryModel.deleteMany({ categoryId: CategoryId });

    //  Delete the category
    await CategoryModel.findByIdAndDelete(CategoryId);

    // Remove images from Cloudinary
    const deleteImages = imageUrls.map((url) => {
        deleteFromCloudinary(url);
    });

    return sendSuccessResponse(res, 200, {}, "Category and its related subcategories and questions deleted successfully");
});

//fetch category by id
export const getCategorieById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { CategoryId } = req.params;

    if (!CategoryId) {
        return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    };

    //  Find the category to delete
    const categoryToFetch = await CategoryModel.findById(CategoryId);
    if (!categoryToFetch) {
        return sendErrorResponse(res, new ApiError(404, "Category not found."));
    };

    return sendSuccessResponse(res, 200, categoryToFetch, "Category retrieved successfully.");
});