import express from 'express';
import { createDepositRequest, updateTransactionStatus, getAllPendingDeposits ,getAllPendingWithdrawals,updateWithdrowalStatus,allTransaction,createWithdrawalRequest, getAllWithdrawals } from '../Controller/transactionController.js';
import {authToken   } from '../middleware/authToken.js';
const transactionRouter = express.Router();

transactionRouter.post('/create-deposit-request',authToken, createDepositRequest);
transactionRouter.put('/update-transaction-status', updateTransactionStatus);
transactionRouter.post('/withdraw',authToken, createWithdrawalRequest);


// --- ADMIN ROUTES ---
transactionRouter.get('/pending-deposits',authToken, getAllPendingDeposits);
transactionRouter.get('/pending-withdrawals', getAllPendingWithdrawals);
transactionRouter.post('/update-status', updateWithdrowalStatus);
transactionRouter.put('/update-withdrawal-status', updateWithdrowalStatus);
transactionRouter.get('/all-withdrawals', getAllWithdrawals);
transactionRouter.get('/all-transactions', allTransaction);



export default transactionRouter;