import express from 'express';
import { sendNotification, getNotifications } from '../Controller/notificationController.js';

const router = express.Router();

router.post('/send', sendNotification);
router.get('/', getNotifications);

export default router;
