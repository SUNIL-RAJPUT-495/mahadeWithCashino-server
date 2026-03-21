import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './Config/Db.js';
import gameRouter from './routes/gameRoutes.js';
import morgan from 'morgan';
import userRouter from './routes/userRouter.js';
import transactionRouter from './routes/transactionRoutes.js';


const app = express();

// Allow only the Vite frontend origin.
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(morgan('dev'));

connectDB()

const PORT = process.env.PORT || 5000;


// Basic Test Route
app.get('/', (req, res) => {
  res.send('Admin Panel API is running with ES Modules!');
});
app.use("/api/user",userRouter)
app.use("/api/game",gameRouter)
app.use("/api/transaction",transactionRouter)

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});