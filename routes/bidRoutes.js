import express from 'express';
import { getAllBids, getUserBids, placeBid } from '../Controller/bidController.js';
import { authToken } from '../middleware/authToken.js';
import { verifyAdminToken } from '../middleware/verifyAdminToken.js';

const bidRouter = express.Router();

bidRouter.post('/place-bid', authToken, placeBid);
bidRouter.get('/get-all-bids', verifyAdminToken, getAllBids);
bidRouter.get('/get-user-bids', authToken, getUserBids);


export default bidRouter;