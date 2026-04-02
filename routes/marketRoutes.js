import express from 'express';
import { addGame, getAllGames, declareResult, getAllResults } from '../Controller/marketController.js';

const marketRouter = express.Router();

marketRouter.post('/add-market', addGame);
marketRouter.get('/get-all-markets', getAllGames);
marketRouter.post('/declare-result', declareResult);
marketRouter.get('/get-all-results', getAllResults);

export default marketRouter;