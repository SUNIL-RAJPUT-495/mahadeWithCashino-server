import express from 'express';
import { sendNotification, getNotifications } from '../Controller/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.post('/send', sendNotification);
notificationRouter.get('/get-all-notifications', getNotifications);

export default notificationRouter;
