import express from 'express';
import { addGame, getAllGames, declareResult, placeBid, getAllBids, getUserBids } from '../Controller/gameController.js';
import { authToken } from '../middleware/authToken.js';

const gameRouter = express.Router();

gameRouter.post('/add-game', addGame);
gameRouter.get('/get-all-games', getAllGames);
gameRouter.post('/declare-result', declareResult);
gameRouter.post('/place-bid', authToken, placeBid);
gameRouter.get('/get-all-bids', getAllBids);
gameRouter.get('/get-user-bids', getUserBids);



export default gameRouter;
