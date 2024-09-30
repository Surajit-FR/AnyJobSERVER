import { Response } from "express";;
import mongoose, { ObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import CategoryModel from "../models/category.model";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { IAddCategoryPayloadReq } from "../../types/requests_responseType";


// addCategory controller
export const addCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { name, categoryImage }: IAddCategoryPayloadReq = req.body;

    // Trim and convert name to lowercase
    const trimmedName = name.trim().toLowerCase();
    console.log("trimmedName is===>", trimmedName);
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

    console.log(catImgFile);
    // Upload files to Cloudinary
    const catImg = await uploadOnCloudinary(catImgFile?.path as string);
    console.log(catImg);

    const newCategory = await CategoryModel.create({
        name,
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
    return sendSuccessResponse(res, 200, {
        results,

    }, "Category retrieved successfully.");
});


// updateCategory controller
export const updateCategory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { CategoryId }  = req.params;
    const { name }: { name: string } = req.body;
    console.log(req.params);


    if (!CategoryId) {
        return sendErrorResponse(res, new ApiError(400, "Category ID is required."));
    };

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(CategoryId) },
        {
            $set: {
                name
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

    // Remove the Category from the database
    const deletedCategory = await CategoryModel.findByIdAndDelete(CategoryId);

    if (!deletedCategory) {
        return sendErrorResponse(res, new ApiError(404, "Category not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Category deleted successfully");
});