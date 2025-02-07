"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAppRating = exports.fetchAppRatingAnalysis = exports.addAppRating = exports.deleteRating = exports.addRating = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const rating_model_1 = __importDefault(require("../models/rating.model"));
const response_1 = require("../utils/response");
const ApisErrors_1 = require("../utils/ApisErrors");
const mongoose_1 = __importDefault(require("mongoose"));
const appReview_model_1 = __importDefault(require("../models/appReview.model"));
// addRating controller
exports.addRating = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { rating, ratedTo, comments } = req.body;
    // Validate required fields
    if (!rating || !ratedTo) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "At least some rating required"));
    }
    ;
    // Create a rating
    const newrating = new rating_model_1.default({
        ratedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
        ratedTo,
        rating,
        comments,
    });
    // Save the rating to the database
    const savedRating = yield newrating.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedRating, "Rating submitted successfully");
}));
// deleteRating controller
exports.deleteRating = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ratingId } = req.params;
    // Validate required fields
    if (!ratingId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Rating Id is required"));
    }
    ;
    const deletedRating = yield rating_model_1.default.findByIdAndDelete({
        _id: new mongoose_1.default.Types.ObjectId(ratingId),
    });
    if (!deletedRating) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Rating not found."));
    }
    return (0, response_1.sendSuccessResponse)(res, 201, {}, "Rating deleted successfully");
}));
exports.addAppRating = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { rating, review } = req.body;
    // Validate required fields
    if (!rating) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "At least some rating required"));
    }
    ;
    // Create a rating
    const newrating = new appReview_model_1.default({
        ratedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
        rating,
        review,
    });
    // Save the rating to the database
    const savedRating = yield newrating.save();
    return (0, response_1.sendSuccessResponse)(res, 201, savedRating, "Rating submitted successfully");
}));
exports.fetchAppRatingAnalysis = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const AppReviewDetails = yield appReview_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "ratedBy",
                as: "ratedBy"
            }
        },
        {
            $unwind: {
                path: "$ratedBy",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                firstName: "$ratedBy.firstName",
                lastName: "$ratedBy.lastName",
                avatar: "$ratedBy.avatar",
            }
        },
        {
            $facet: {
                totalStats: [
                    {
                        $group: {
                            _id: null,
                            totalRatings: { $sum: 1 },
                            totalReviews: {
                                $sum: {
                                    $cond: [{ $ne: ["$review", ""] }, 1, 0]
                                }
                            },
                            avgRating: { $avg: "$rating" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalRatings: 1,
                            totalReviews: 1,
                            avgRating: { $round: ["$avgRating", 2] }
                        }
                    }
                ],
                groupedByRating: [
                    {
                        $group: {
                            _id: "$rating",
                            count: { $sum: 1 },
                            reviews: {
                                $push: {
                                    firstName: "$firstName",
                                    lastName: "$lastName",
                                    avatar: "$avatar",
                                    review: "$review",
                                    createdAt: "$createdAt",
                                    updatedAt: "$updatedAt"
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            rating: "$_id",
                            count: 1,
                            // reviews: 1
                        }
                    },
                    {
                        $sort: { rating: 1 }
                    }
                ]
            }
        },
        {
            $project: {
                totalStats: { $arrayElemAt: ["$totalStats", 0] },
                groupedByRating: 1
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, AppReviewDetails[0], "Ratings analysis fetched successfully");
}));
exports.fetchAppRating = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const AppReviewDetails = yield appReview_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "ratedBy",
                as: "ratedBy"
            }
        },
        {
            $unwind: {
                path: "$ratedBy",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                firstName: "$ratedBy.firstName",
                lastName: "$ratedBy.lastName",
                avatar: "$ratedBy.avatar",
            }
        },
        {
            $group: {
                _id: null,
                totalNumberOfRatings: { $sum: 1 },
                totalReviews: {
                    $sum: {
                        $cond: [{ $ne: ["$review", ""] }, 1, 0]
                    }
                },
                avgRating: { $avg: "$rating" },
                details: {
                    $push: {
                        firstName: "$firstName",
                        lastName: "$lastName",
                        avatar: "$avatar",
                        rating: "$rating",
                        review: "$review",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt"
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                details: 1,
                totalNumberOfRatings: 1,
                totalReviews: 1,
                avgRating: 1
            }
        },
        {
            $sort: {
                'details.rating': 1
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, AppReviewDetails[0], "Ratings fetched successfully");
}));
