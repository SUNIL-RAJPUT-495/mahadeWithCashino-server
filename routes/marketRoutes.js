import express from 'express';
import { addGame, getAllGames, declareResult, getAllResults } from '../Controller/marketController.js';
import { verifyAdminToken } from '../middleware/verifyAdminToken.js';

const marketRouter = express.Router();

marketRouter.post('/add-market', verifyAdminToken, addGame);
marketRouter.get('/get-all-markets', getAllGames);
marketRouter.post('/declare-result', verifyAdminToken, declareResult);
marketRouter.get('/get-all-results', getAllResults);

export default marketRouter;