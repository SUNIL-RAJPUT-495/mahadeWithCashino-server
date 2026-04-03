import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';

// Send a custom notification (Admin)
export const sendNotification = async (req, res) => {
    try {
        const { title, message, sendToAllUsers } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        const notification = new Notification({
            title,
            message,
            type: 'Alert',
            userId: null,
        });

        await notification.save();

        res.status(201).json({ success: true, message: 'Notification sent successfully', notification });
    } catch (error) {
        console.error("sendNotification error:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// Get notifications: sab users + (logged-in) apni user-specific rows
export const getNotifications = async (req, res) => {
    try {
        let userId = null;
        const auth = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
        if (auth && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(auth, process.env.JWT_SECRET);
                userId = decoded._id || decoded.id;
            } catch {
                /* invalid token — sirf public notifications */
            }
        }

        const globalOr = [
            { userId: null },
            { userId: { $exists: false } },
        ];

        let notifications;
        if (userId) {
            notifications = await Notification.find({
                $or: [...globalOr, { userId }],
            })
                .sort({ createdAt: -1 })
                .limit(50);
        } else {
            notifications = await Notification.find({ $or: globalOr })
                .sort({ createdAt: -1 })
                .limit(50);
        }

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("getNotifications error:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};
