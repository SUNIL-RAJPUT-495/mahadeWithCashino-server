import { Conversation, Message } from "../models/chat.model.js";
import User from "../models/User.js";
import { pusher } from "../utils/pusher.js";
import mongoose from "mongoose";

// Helper function to get Admin ID
const getAdminId = async () => {
    const admin = await User.findOne({ role: { $regex: /^admin$/i } }).lean();
    return admin ? admin._id.toString() : null;
};

// --- 1. SEND MESSAGE 
export const sendMessage = async (req, res) => {
    try {
        const { message, receiver } = req.body;
        const senderId = req.userId; 

        const ADMIN_ID = await getAdminId();
        if (!ADMIN_ID) {
            return res.status(500).json({ success: false, message: "System Error: Admin not found" });
        }
    
        const isSenderAdmin = senderId.toString() === ADMIN_ID.toString();
        
        let finalReceiverId = isSenderAdmin ? receiver : ADMIN_ID;

        if (finalReceiverId === "admin") finalReceiverId = ADMIN_ID;

        // Validation
        if (!finalReceiverId || !mongoose.Types.ObjectId.isValid(finalReceiverId)) {
            return res.status(400).json({ success: false, message: "Invalid Receiver ID" });
        }

        const senderObjId = new mongoose.Types.ObjectId(senderId);
        const receiverObjId = new mongoose.Types.ObjectId(finalReceiverId);

        let conversation = await Conversation.findOne({
            participants: { $all: [senderObjId, receiverObjId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderObjId, receiverObjId]
            });
        }

        const newMessage = await Message.create({
            conversationId: conversation._id,
            sender: senderObjId,
            message: message.trim(),
            seen: false
        });

        conversation.lastMessage = message.trim();
        await conversation.save();

        const messageData = newMessage.toObject();
        messageData.sender = senderId;
        messageData.receiver = finalReceiverId;


        let targetChannelId;
        if (isSenderAdmin) {
            targetChannelId = finalReceiverId.toString(); 
        } else {
            targetChannelId = senderId.toString(); 
        }

        const channelName = `chat-${targetChannelId}`;

        console.log(`📢 Backend sending to Pusher Channel: ${channelName}`);
        console.log(`📨 Message Sender: ${isSenderAdmin ? 'Admin' : 'User'}`);

        try {
            await pusher.trigger(channelName, "new-message", {
                message: messageData
            });
        } catch (err) {
            console.log("⚠️ Pusher Error:", err.message);
        }

        res.status(200).json({ success: true, data: messageData });

    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// --- 2. GET CHAT USERS (Admin Sidebar) ---
export const getChatUsers = async (req, res) => {
    try {
        const loggedInUserId = req.userId.toString();
        const conversations = await Conversation.find({
            participants: { $in: [loggedInUserId] }
        })
        .populate("participants", "name email") 
        .sort({ updatedAt: -1 });

        const finalData = conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id.toString() !== loggedInUserId);
            return {
                conversationId: conv._id,
                _id: otherUser ? otherUser._id : "Unknown",
                name: otherUser ? otherUser.name : "User Not Found",
                email: otherUser ? otherUser.email : "No Email",
                lastMessage: conv.lastMessage,
                lastChatTime: conv.updatedAt
            };
        });
        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 3. GET CHAT HISTORY ---
export const getUserChatHistory = async (req, res) => {
    try {
        let { userId } = req.params;
        const loggedInUserId = req.userId.toString();
        const ADMIN_ID = await getAdminId();

        if (userId === "admin") userId = ADMIN_ID;

        const targetObjId = new mongoose.Types.ObjectId(userId);
        const loggedInObjId = new mongoose.Types.ObjectId(loggedInUserId);

        const conversation = await Conversation.findOne({
            participants: { $all: [loggedInObjId, targetObjId] }
        });

        if (!conversation) return res.status(200).json({ success: true, data: [] });

        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).lean();
        
        const data = messages.map(m => ({
            ...m,
            receiver: m.sender.toString() === loggedInUserId ? userId : loggedInUserId,
            isMine: m.sender.toString() === loggedInUserId
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: "History fetch failed" });
    }
};