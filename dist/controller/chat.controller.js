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
exports.fetchChatList = exports.updateChatList = exports.fetchChatHistory = exports.saveChatMessage = void 0;
const chat_model_1 = __importDefault(require("../models/chat.model"));
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const chatList_model_1 = __importDefault(require("../models/chatList.model"));
const saveChatMessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const chat = new chat_model_1.default(message);
    yield chat.save();
});
exports.saveChatMessage = saveChatMessage;
//fetch chat controller
exports.fetchChatHistory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId1, userId2 } = req.query;
    if (!userId1 || !userId2) {
        return res.status(400).json({ error: "Both userId1 and userId2 are required" });
    }
    // Convert query IDs to ObjectId
    const userId1Obj = new mongoose_1.default.Types.ObjectId(userId1);
    const userId2Obj = new mongoose_1.default.Types.ObjectId(userId2);
    // Fetch chat history
    const chatHistory = yield chat_model_1.default.aggregate([
        {
            $match: {
                $or: [
                    { fromUserId: userId1Obj, toUserId: userId2Obj },
                    { fromUserId: userId2Obj, toUserId: userId1Obj },
                ],
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "toUserId",
                as: "toUserId"
            }
        },
        {
            $unwind: {
                path: "$toUserId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "fromUserId",
                as: "fromUserId"
            }
        },
        {
            $unwind: {
                path: "$fromUserId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                'toUserId._id': 1,
                'toUserId.firstName': 1,
                'toUserId.lastName': 1,
                'toUserId.avatar': 1,
                'fromUserId._id': 1,
                'fromUserId.firstName': 1,
                'fromUserId.lastName': 1,
                'fromUserId.avatar': 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);
    // Return chat history
    return (0, response_1.sendSuccessResponse)(res, 200, chatHistory, "Chat history fetched successfully");
}));
//update chat function
const updateChatList = (userId, chatWithUserId, message, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if the chat list entry exists for the user
    const existingChatList = yield chatList_model_1.default.findOne({
        userId: userId,
        chatWithUserId: chatWithUserId,
    });
    if (existingChatList) {
        // Update the existing chat list entry with the latest message and timestamp
        existingChatList.lastMessage = message;
        existingChatList.lastMessageAt = timestamp;
        yield existingChatList.save();
    }
    else {
        // Create a new entry in the chat list for the user
        const newChatListEntry = new chatList_model_1.default({
            userId: userId,
            chatWithUserId: chatWithUserId,
            lastMessage: message,
            lastMessageAt: timestamp,
        });
        yield newChatListEntry.save();
    }
});
exports.updateChatList = updateChatList;
//fetch chat list controller
exports.fetchChatList = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }
    const userIdObj = new mongoose_1.default.Types.ObjectId(userId);
    const chatList = yield chatList_model_1.default.aggregate([
        {
            $match: {
                userId: userIdObj,
            },
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "chatWithUserId",
                as: "chatWithUserId"
            }
        },
        {
            $unwind: {
                path: "$chatWithUserId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                userId: 1,
                lastMessage: 1,
                lastMessageAt: 1,
                'chatWithUserId._id': 1,
                'chatWithUserId.firstName': 1,
                'chatWithUserId.lastName': 1,
                'chatWithUserId.avatar': 1
            }
        }
    ]);
    return (0, response_1.sendSuccessResponse)(res, 200, chatList, "Chat list fetched successfully");
}));
