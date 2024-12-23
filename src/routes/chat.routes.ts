import express, { Router } from 'express';
import { fetchChatHistory, fetchChatList } from "../controller/chat.controller";

const router: Router = express.Router();


router.route('/fetch-chat-history')
    .get(fetchChatHistory);

router.route('/fetch-chat-list')
    .get(fetchChatList);


export default router;