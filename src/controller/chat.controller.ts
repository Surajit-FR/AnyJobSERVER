import ChatModel from "../models/chat.model";
import { Request, Response } from "express";
import { sendSuccessResponse } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import ChatListModel from "../models/chatList.model";

export const saveChatMessage = async (message: {
    fromUserId: string;
    toUserId: string;
    content: string;
    timestamp: Date;
}) => {
    const chat = new ChatModel(message);
    await chat.save();
};

export const fetchChatHistory = asyncHandler(async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.query;

    if (!userId1 || !userId2) {
        return res.status(400).json({ error: "Both userId1 and userId2 are required" });
    }

    // Convert query IDs to ObjectId
    const userId1Obj = new mongoose.Types.ObjectId(userId1 as string);
    const userId2Obj = new mongoose.Types.ObjectId(userId2 as string);


    // Fetch chat history
    const chatHistory = await ChatModel.aggregate([
        {
            $match: {
                $or: [
                    { fromUserId: userId1Obj, toUserId: userId2Obj },
                    { fromUserId: userId2Obj, toUserId: userId1Obj },
                ],
            }
        },
        {
            $sort: {
                _id: -1
            }
        }
    ])
    // Return chat history
    return sendSuccessResponse(res, 200, chatHistory, "Chat history fetched successfully")
});

export const updateChatList = async (
    userId: string,
    chatWithUserId: string,
    message: string,
    timestamp: Date
) => {
    // Check if the chat list entry exists for the user
    const existingChatList = await ChatListModel.findOne({
        userId: userId,
        chatWithUserId: chatWithUserId,
    });

    if (existingChatList) {
        // Update the existing chat list entry with the latest message and timestamp
        existingChatList.lastMessage = message;
        existingChatList.lastMessageAt = timestamp;
        await existingChatList.save();
    } else {
        // Create a new entry in the chat list for the user
        const newChatListEntry = new ChatListModel({
            userId: userId,
            chatWithUserId: chatWithUserId,
            lastMessage: message,
            lastMessageAt: timestamp,
        });
        await newChatListEntry.save();
    }
};

export const fetchChatList = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId as string);

    const chatList = await ChatListModel.aggregate([
        {
            $match: {
                userId: userIdObj,
            },
        },

    ]);

    return sendSuccessResponse(res, 200, chatList, "Chat list fetched successfully");
});


