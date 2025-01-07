import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import { asyncHandler } from "../utils/asyncHandler";
import RatingModel from "../models/rating.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { ApiError } from "../utils/ApisErrors";
import mongoose from "mongoose";


// addRating controller
export const addRating = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { rating, ratedTo, comments } = req.body;

    // Validate required fields
    if (!rating || !ratedTo) {
        return sendErrorResponse(res, new ApiError(400, "At least some rating required"));
    };

    // Create a rating
    const newrating = new RatingModel({
        ratedBy: req.user?._id,
        ratedTo,
        rating,
        comments,
    });

    // Save the rating to the database
    const savedRating = await newrating.save();

    return sendSuccessResponse(res, 201, savedRating, "Rating submitted successfully");
});

// deleteRating controller
export const deleteRating = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { ratingId } = req.params;

    // Validate required fields
    if (!ratingId) {
        return sendErrorResponse(res, new ApiError(400, "Rating Id is required"));
    };
    const deletedRating = await RatingModel.findByIdAndDelete({
        _id: new mongoose.Types.ObjectId(ratingId),
    });

    if (!deletedRating) {
        return sendErrorResponse(res, new ApiError(400, "Rating not found."));
    }

    return sendSuccessResponse(res, 201, {}, "Rating deleted successfully");
});