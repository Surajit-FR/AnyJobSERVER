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
exports.fetchShifs = exports.fetchShiftbyId = exports.addShift = void 0;
;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = require("../utils/asyncHandler");
const ApisErrors_1 = require("../utils/ApisErrors");
const response_1 = require("../utils/response");
const shift_model_1 = __importDefault(require("../models/shift.model"));
//addShift controller
exports.addShift = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { shiftName, shiftTimes } = req.body;
    //trimmed shiftName
    const trimmedShiftName = shiftName.trim().toLowerCase();
    //check for the duplicacy
    const existinfShiftName = yield shift_model_1.default.findOne({ name: trimmedShiftName });
    if (existinfShiftName) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Category with the same name already exists."));
    }
    ;
    // Create and save the shift
    const newShift = yield shift_model_1.default.create({
        shiftName: trimmedShiftName,
        shiftTimes,
        createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
    });
    if (!newShift) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Something went wrong while adding the Shift."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 201, newShift, "Shift added Successfully");
}));
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
    return (0, response_1.sendSuccessResponse)(res, 200, results[0], "Shift Timings retrieved successfully.");
}));
exports.fetchShifs = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield shift_model_1.default.find({ isDeleted: false }).select('-__v -isDeleted');
    return (0, response_1.sendSuccessResponse)(res, 200, results, "Shift Timings retrieved successfully.");
}));
