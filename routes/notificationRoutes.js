import express from 'express';
import { sendNotification, getNotifications } from '../Controller/notificationController.js';
import { verifyAdminToken } from '../middleware/verifyAdminToken.js';

const notificationRouter = express.Router();

notificationRouter.post('/send', verifyAdminToken, sendNotification);
notificationRouter.get('/get-all-notifications', getNotifications);

export default notificationRouter;
