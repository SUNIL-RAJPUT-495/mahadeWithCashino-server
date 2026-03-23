import Notification from '../models/Notification.js';

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
            type: 'Alert'
        });

        await notification.save();

        res.status(201).json({ success: true, message: 'Notification sent successfully', notification });
    } catch (error) {
        console.error("sendNotification error:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// Get all notifications (User & Admin)
export const getNotifications = async (req, res) => {
    try {
        // Fetch the 20 most recent notifications
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("getNotifications error:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};
