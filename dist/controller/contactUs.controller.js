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
exports.deleteQueryMessage = exports.fetchQueryMessage = exports.sendQueryMessage = void 0;
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const contactUs_model_1 = __importDefault(require("../models/contactUs.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const mongoose_1 = __importDefault(require("mongoose"));
exports.sendQueryMessage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { fullName, email, contactNumber, message } = req.body;
    const senderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!fullName || !email || !contactNumber || !message) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Fullname email,contact and message all are required field"));
    }
    ;
    const contactUsData = yield contactUs_model_1.default.create({
        fullName,
        email,
        contactNumber,
        message,
        senderId,
    });
    if (!contactUsData) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Failed to send your message."));
    }
    ;
    return (0, response_1.sendSuccessResponse)(res, 200, contactUsData, "Message sent successfully.");
}));
exports.fetchQueryMessage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const queryMessages = yield contactUs_model_1.default.aggregate([
        {
            $match: {
                isDeleted: false,
                isRead: false
            }
        },
        {
            $project: {
                _id: 1,
                fullName: 1,
                email: 1,
                contactNumber: 1,
                message: 1,
                isRead: 1,
            }
        }
    ]);
    if (!queryMessages.length) {
        return (0, response_1.sendSuccessResponse)(res, 200, "No messages till now.");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, queryMessages, "Query messages fetched successfully.");
}));
exports.deleteQueryMessage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId } = req.params;
    if (!messageId) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "messageId is required"));
    }
    const deletedQueryMessages = yield contactUs_model_1.default.findByIdAndDelete({ _id: new mongoose_1.default.Types.ObjectId(messageId) });
    if (!deletedQueryMessages) {
        return (0, response_1.sendSuccessResponse)(res, 200, "No messages deleted");
    }
    return (0, response_1.sendSuccessResponse)(res, 200, "Query messages deleted successfully.");
}));
