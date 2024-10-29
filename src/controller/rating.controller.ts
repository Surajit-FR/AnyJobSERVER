import { Response } from "express";
import { CustomRequest } from "../../types/commonType";
import { asyncHandler } from "../utils/asyncHandler";
import RatingModel from "../models/rating.model";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import { ApiError } from "../utils/ApisErrors";

// addRating controller
export const addRating = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { rating, ratedTo } = req.body;

    // Validate required fields
    if (!rating || !ratedTo) {
        return sendErrorResponse(res, new ApiError(400, "At least some rating required"));
    };

    // Create a rating
    const newrating = new RatingModel({
        ratedBy: req.user?._id,
        ratedTo,
        rating,
    });

    // Save the rating to the database
    const savedRating = await newrating.save();

    return sendSuccessResponse(res, 201, savedRating, "Rating submitted successfully");
});