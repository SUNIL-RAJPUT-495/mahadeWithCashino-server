import express from 'express';
import { getSettings, updateSettings } from '../Controller/TransactionSettingController.js'; 
import { verifyAdminToken } from '../middleware/verifyAdminToken.js'

const transactionSettingRouter = express.Router();

transactionSettingRouter.get('/get-transaction-settings', getSettings);
transactionSettingRouter.post('/update-transaction-settings',verifyAdminToken, updateSettings);

export default transactionSettingRouter;