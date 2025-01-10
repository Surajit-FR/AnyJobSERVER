import { Request, Response } from "express";;
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import ShiftModel from "../models/shift.model";
import { IShiftTimeSchema } from "../../types/schemaTypes";


// addShift controller
export const addShift = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { shiftName, shiftTimes }: { shiftName: String, shiftTimes: IShiftTimeSchema } = req.body;

    //trimmed shiftName
    const trimmedShiftName = shiftName.trim().toLowerCase();

    //check for the duplicacy
    const existinfShiftName = await ShiftModel.findOne({ shiftName: trimmedShiftName });

    if (existinfShiftName) {
        return sendErrorResponse(res, new ApiError(400, "Shift with the same name already exists."));
    };

    // Create and save the shift
    console.log("===");
    const newShift = await ShiftModel.create({
        shiftName: trimmedShiftName,
        shiftTimes,
        createdBy: req.user?._id
    });

    if (!newShift) {
        return sendErrorResponse(res, new ApiError(500, "Something went wrong while adding the Shift."));
    };

    return sendSuccessResponse(res, 201, newShift, "Shift added Successfully");

})

// fetchShiftbyId controller
export const fetchShiftbyId = asyncHandler(async (req: Request, res: Response) => {

    const { shiftId } = req.params;
    const results = await ShiftModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(shiftId)
            }
        },
        {
            $project: {
                isDeleted: 0,
                __v: 0,
            }
        }
    ]);
    const responseData = results.length
        ? sendSuccessResponse(res, 200, results[0], "Shift Timings retrieved successfully.")
        : sendErrorResponse(res, new ApiError(400, "Shift not found."));
    return responseData

});

// fetchShifs controller
export const fetchShifs = asyncHandler(async (req: CustomRequest, res: Response) => {

    const results = await ShiftModel.find({ isDeleted: false }).select('-__v -isDeleted');

    const responseData = results.length
        ? sendSuccessResponse(res, 200, results, "Shift Timings retrieved successfully.")
        : sendErrorResponse(res, new ApiError(400, "Shift not found."));
    return responseData;

});

// updateShift Controller
export const updateShift = asyncHandler(async (req: Request, res: Response) => {
    const { shiftId } = req.params;
    const { shiftName, shiftTimes }: { shiftName: string, shiftTimes: Array<IShiftTimeSchema> } = req.body;

    if (!shiftId) {
        return sendErrorResponse(res, new ApiError(400, "Shift ID is required."));
    };

    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid shift ID."));
    };

    // Trim and convert name to lowercase for case-insensitive comparison
    const trimmedName = shiftName.trim();

    // Check if a category with the same name already exists, excluding the current category being updated
    const existingShift = await ShiftModel.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(shiftId) },  // Exclude the current category
        shiftName: { $regex: new RegExp(`^${trimmedName}$`, 'i') }   // Case-insensitive name comparison
    });

    if (existingShift) {
        return sendErrorResponse(res, new ApiError(400, "Category with the same name already exists."));
    }

    // Update the shift details with new name and image (if uploaded)
    const updatedShift = await ShiftModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(shiftId),
        {
            $set: {
                shiftName: trimmedName,
                shiftTimes: shiftTimes
            },
        },
        { new: true }
    );

    if (!updatedShift) {
        return sendErrorResponse(res, new ApiError(400, "Shift not found for updating."));
    };

    return sendSuccessResponse(res, 200, updatedShift, "Shift updated Successfully");
});

// deleteShift controller
export const deleteShift = asyncHandler(async (req: Request, res: Response) => {
    const { shiftId } = req.params;

    if (!shiftId) {
        return sendErrorResponse(res, new ApiError(400, "Shift ID is required."));
    };

    if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        return sendErrorResponse(res, new ApiError(400, "Invalid shift ID."));
    };

    // Delete the shift details 
    const deletedShift = await ShiftModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(shiftId),
        {
            $set: { isDeleted: true }
        },
    );

    if (!deletedShift) {
        return sendErrorResponse(res, new ApiError(400, "Shift not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Shift deleted Successfully");
});