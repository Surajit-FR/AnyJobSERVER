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
exports.deleteShift = exports.updateShift = exports.fetchAvilableShifs = exports.fetchShifs = exports.fetchShiftbyId = exports.addShift = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = require("../utils/asyncHandler");
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const shift_model_1 = __importDefault(require("../models/shift.model"));
// addShift controller
exports.addShift = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("api hits");
    const { shiftName, shiftTimes } = req.body;
    //trimmed shiftName
    const trimmedShiftName = shiftName.trim().toLowerCase();
    //check for the duplicacy
    const existinfShiftName = yield shift_model_1.default.findOne({ shiftName: trimmedShiftName });
    if (existinfShiftName) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift with the same name already exists."));
    }
    ;
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
    const newShift = yield shift_model_1.default.create({
        shiftName: trimmedShiftName,
        shiftTimes: shiftTimes,
        createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
    });
    if (!newShift) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while adding the Shift."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, newShift, "Shift added Successfully");
}));
// fetchShiftbyId controller
exports.fetchShiftbyId = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { shiftId } = req.params;
    const results = yield shift_model_1.default.aggregate([
        {
            $match: {
                _id: new mongoose_1.default.Types.ObjectId(shiftId)
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
        ? (0, response_1.sendSuccessResponse)(res, 200, results[0], "Shift Timings retrieved successfully.")
        : (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift not found."));
    return responseData;
}));
// fetchShifs controller
exports.fetchShifs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield shift_model_1.default.aggregate([
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
        return (0, response_1.sendSuccessResponse)(res, 200, results, "Shift Timings retrieved successfully.");
    }
    else {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift not found."));
    }
}));
exports.fetchAvilableShifs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentISTTime = new Date();
    currentISTTime.setMinutes(currentISTTime.getMinutes() + 330);
    const currentHours = currentISTTime.getUTCHours();
    const currentMinutes = currentISTTime.getUTCMinutes();
    const { fetchingDate } = req.params;
    const providedDate = new Date(fetchingDate);
    const currentDateIST = new Date(currentISTTime.toISOString().split('T')[0]);
    // Check if fetchingDate is in the past
    if (providedDate < currentDateIST) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Booking date cannot be in the past."));
    }
    const isToday = providedDate.toISOString().split('T')[0] === currentDateIST.toISOString().split('T')[0];
    const results = yield shift_model_1.default.aggregate([
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
        return (0, response_1.sendSuccessResponse)(res, 200, results, "Available shift timings retrieved successfully.");
    }
    else {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "No available shift timings."));
    }
}));
// updateShift Controller
exports.updateShift = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { shiftId } = req.params;
    const { shiftName, shiftTimes } = req.body;
    if (!shiftId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift ID is required."));
    }
    ;
    if (!mongoose_1.default.Types.ObjectId.isValid(shiftId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid shift ID."));
    }
    ;
    // Trim and convert name to lowercase for case-insensitive comparison
    const trimmedName = shiftName.trim();
    // Check if a category with the same name already exists, excluding the current category being updated
    const existingShift = yield shift_model_1.default.findOne({
        _id: { $ne: new mongoose_1.default.Types.ObjectId(shiftId) }, // Exclude the current category
        shiftName: { $regex: new RegExp(`^${trimmedName}$`, 'i') } // Case-insensitive name comparison
    });
    if (existingShift) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category with the same name already exists."));
    }
    // Update the shift details with new name and image (if uploaded)
    const updatedShift = yield shift_model_1.default.findByIdAndUpdate(new mongoose_1.default.Types.ObjectId(shiftId), {
        $set: {
            shiftName: trimmedName,
            shiftTimes: shiftTimes
        },
    }, { new: true });
    if (!updatedShift) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift not found for updating."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, updatedShift, "Shift updated Successfully");
}));
// deleteShift controller
exports.deleteShift = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { shiftId } = req.params;
    if (!shiftId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift ID is required."));
    }
    ;
    if (!mongoose_1.default.Types.ObjectId.isValid(shiftId)) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid shift ID."));
    }
    ;
    // Delete the shift details 
    const deletedShift = yield shift_model_1.default.findByIdAndDelete(new mongoose_1.default.Types.ObjectId(shiftId));
    if (!deletedShift) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Shift not found for deleting."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, {}, "Shift deleted Successfully");
}));
