import { Router } from "express";
import { getChatUsers, getUserChatHistory, sendMessage } from "../Controller/chat.controller copy.js";
import { authToken } from "../middleware/authToken.js";

const chatRouter = Router()

chatRouter.post("/send", authToken, sendMessage)
chatRouter.get("/get-users", authToken, getChatUsers);
chatRouter.get("/getUserChatHistory/:userId", authToken, getUserChatHistory)

export default chatRouter;