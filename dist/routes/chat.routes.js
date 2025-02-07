"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chat_controller_1 = require("../controller/chat.controller");
const router = express_1.default.Router();
router.route('/fetch-chat-history')
    .get(chat_controller_1.fetchChatHistory);
router.route('/fetch-chat-list')
    .get(chat_controller_1.fetchChatList);
exports.default = router;
