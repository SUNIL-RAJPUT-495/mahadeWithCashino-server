import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './Config/Db.js';
import gameRouter from './routes/gameRoutes.js';
import morgan from 'morgan';
import userRouter from './routes/userRouter.js';
import transactionRouter from './routes/transactionRoutes.js';

dotenv.config();

const app = express();

// CORS ko thoda flexible banaya hai taaki Vercel aur localhost dono par chale
app.use(cors({ 
  origin: ["http://localhost:5173", process.env.FRONTEND_URL], // Apna production URL env mein daal dena
  credentials: true 
}));

app.use(express.json());
app.use(morgan('dev'));

// Database connect
connectDB();

// Basic Test Route
app.get('/', (req, res) => {
  res.send('Admin Panel API is running on Vercel Serverless!');
});

// Routes
app.use("/api/user", userRouter);
app.use("/api/game", gameRouter);
app.use("/api/transaction", transactionRouter);

// Vercel ke liye humein app.listen() hata kar app ko export karna hota hai
export default app;