import { Response } from "express";;
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import ShiftModel from "../models/shift.model";
import { IShiftTimeSchema } from "../../types/schemaTypes";

//addShift controller
export const addShift = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { shiftName, shiftTimes }: { shiftName: String, shiftTimes: IShiftTimeSchema } = req.body;

    //trimmed shiftName
    const trimmedShiftName = shiftName.trim().toLowerCase();

    //check for the duplicacy
    const existinfShiftName = await ShiftModel.findOne({ name: trimmedShiftName });

    if (existinfShiftName) {
        return sendErrorResponse(res, new ApiError(400, "Category with the same name already exists."));
    };

    // Create and save the shift
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

export const fetchShiftbyId = asyncHandler(async (req: CustomRequest, res: Response) => {

    const { shiftId } = req.params;
    const results = await ShiftModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(shiftId)
            }
        },
        {
            $project:{
                isDeleted:0,
                __v:0,
            }
        }
    ]);

    return sendSuccessResponse(res, 200, results[0], "Shift Timings retrieved successfully.");
});

export const fetchShifs = asyncHandler(async (req: CustomRequest, res: Response) => {

    const results = await ShiftModel.find({ isDeleted: false }).select('-__v -isDeleted');

    return sendSuccessResponse(res, 200, results, "Shift Timings retrieved successfully.");
});