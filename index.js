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
  origin: ["http://localhost:5173", "https://mahadematka.vercel.app", process.env.FRONTEND_URL], // Apna production URL env mein daal dena
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

// 👇 LOCALHOST KE LIYE YEH ADD KARNA ZARURI HAI 👇
const PORT = process.env.PORT || 5000;

// Agar system Vercel (production) par nahi hai, tabhi listen karega
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}

// Vercel Serverless functions ke liye export karna zaruri hai
export default app;