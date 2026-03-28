import express from 'express';
import { addGame, getAllGames, declareResult } from '../Controller/marketController.js';

const marketRouter = express.Router();

marketRouter.post('/add-market', addGame);
marketRouter.get('/get-all-markets', getAllGames);
marketRouter.post('/declare-result', declareResult);

export default marketRouter;