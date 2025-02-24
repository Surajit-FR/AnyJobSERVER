import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomRequest } from "../../types/commonType";
import { ApiError } from "../utils/ApisErrors";
import { sendErrorResponse, sendSuccessResponse } from "../utils/response";
import ShiftModel from "../models/shift.model";
import { IShiftTimeSchema } from "../../types/schemaTypes";
import { MomentTimezone } from "moment-timezone";
import moment from 'moment-timezone';

// addShift controller
export const addShift = asyncHandler(async (req: CustomRequest, res: Response) => {
    console.log("api hits");

    const { shiftName, shiftTimes }: { shiftName: String, shiftTimes: IShiftTimeSchema[] } = req.body;

    //trimmed shiftName
    const trimmedShiftName = shiftName.trim().toLowerCase();

    //check for the duplicacy
    const existinfShiftName = await ShiftModel.findOne({ shiftName: trimmedShiftName });

    if (existinfShiftName) {
        return sendErrorResponse(res, new ApiError(400, "Shift with the same name already exists."));
    };

    // Function to convert readable time to UTC
    // const convertTimeToUTC = (time: string) => {
    //     const todayDate = moment().format("YYYY-MM-DD");
    //     const dateTimeIST = `${todayDate} ${time}`;
    //     const utcDateTime = moment.tz(dateTimeIST, "YYYY-MM-DD h:mm A", "Asia/Kolkata").utc();
    //     return utcDateTime.toISOString();
    // };

    // Convert all shiftTimes to UTC
    // const formattedShiftTimes = shiftTimes.map(({ startTime, endTime }: IShiftTimeSchema) => ({
    //     startTime: new Date(startTime),
    //     endTime: new Date(endTime),
    // }));

    // Create and save the shift
    const newShift = await ShiftModel.create({
        shiftName: trimmedShiftName,
        shiftTimes: shiftTimes,
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
    const results = await ShiftModel.aggregate([
        { $match: { isDeleted: false } },
        {
            $project: {
                _id: 1,
                shiftName: 1,
                shiftTimes: {
                    $map: {
                        input: "$shiftTimes",
                        as: "shift",
                        in: {
                            startTime: {
                                $dateToString: {
                                    format: "%H:%M",
                                    date: "$$shift.startTime",
                                    timezone: "Asia/Kolkata"
                                }
                            },
                            endTime: {
                                $dateToString: {
                                    format: "%H:%M",
                                    date: "$$shift.endTime",
                                    timezone: "Asia/Kolkata"
                                }
                            },
                            _id: "$$shift._id"
                        }
                    }
                }
            }
        }
    ]);
    if (results.length) {
        return sendSuccessResponse(res, 200, results, "Shift Timings retrieved successfully.");
    } else {
        return sendErrorResponse(res, new ApiError(400, "Shift not found."));
    }
});

export const fetchAvilableShifs = asyncHandler(async (req: CustomRequest, res: Response) => {
    const currentISTTime = new Date();
    currentISTTime.setMinutes(currentISTTime.getMinutes() + 330);
    const currentHours = currentISTTime.getUTCHours();
    const currentMinutes = currentISTTime.getUTCMinutes();
    const { fetchingDate } = req.params;
    const providedDate = new Date(fetchingDate);
    const currentDateIST = new Date(currentISTTime.toISOString().split('T')[0]);

    // Check if fetchingDate is in the past
    if (providedDate < currentDateIST) {
        return sendErrorResponse(res, new ApiError(400, "Booking date cannot be in the past."));
    }

    const isToday = providedDate.toISOString().split('T')[0] === currentDateIST.toISOString().split('T')[0];
    const results = await ShiftModel.aggregate([
        { $match: { isDeleted: false } },
        {
            $addFields: {
                shiftTimes: {
                    $filter: {
                        input: {
                            $map: {
                                input: "$shiftTimes",
                                as: "shift",
                                in: {
                                    startTime: {
                                        $dateToString: {
                                            format: "%H:%M",
                                            date: "$$shift.startTime",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    endTime: {
                                        $dateToString: {
                                            format: "%H:%M",
                                            date: "$$shift.endTime",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    endHour: {
                                        $cond: {
                                            if: { $eq: [{ $hour: { $add: ["$$shift.endTime", 19800000] } }, 0] },
                                            then: 24,
                                            else: { $hour: { $add: ["$$shift.endTime", 19800000] } }
                                        }
                                    },
                                    endMinute: { $minute: { $add: ["$$shift.endTime", 19800000] } },
                                    _id: "$$shift._id"
                                }
                            }
                        },
                        as: "shift",
                        cond: isToday ? {
                            $or: [
                                { $gt: ["$$shift.endHour", currentHours] },
                                {
                                    $and: [
                                        { $eq: ["$$shift.endHour", currentHours] },
                                        { $gt: ["$$shift.endMinute", currentMinutes] }
                                    ]
                                }
                            ]
                        } : {}

                    },
                }
            }
        },
        {
            $project: {
                _id: 1,
                shiftName: 1,
                'shiftTimes._id': 1,
                'shiftTimes.startTime': 1,
                'shiftTimes.endTime': 1,
            }
        },
        {
            $match: {
                $expr: { $gt: [{ $size: "$shiftTimes" }, 0] }
            }
        }
    ]);


    if (results.length) {
        return sendSuccessResponse(res, 200, results, "Available shift timings retrieved successfully.");
    } else {
        return sendErrorResponse(res, new ApiError(400, "No available shift timings."));
    }
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
    const deletedShift = await ShiftModel.findByIdAndDelete(
        new mongoose.Types.ObjectId(shiftId),

    );

    if (!deletedShift) {
        return sendErrorResponse(res, new ApiError(400, "Shift not found for deleting."));
    };

    return sendSuccessResponse(res, 200, {}, "Shift deleted Successfully");
});