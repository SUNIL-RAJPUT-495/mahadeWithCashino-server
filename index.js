import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './Config/Db.js';
import morgan from 'morgan';
import userRouter from './routes/userRouter.js';
import transactionRouter from './routes/transactionRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import chatRouter from './routes/chat.router.js';
import bidRouter from './routes/bidRoutes.js';
import marketRouter from './routes/marketRoutes.js';

const app = express();


app.use(cors({ 
  origin: ["http://localhost:5173", "https://mahadematka.vercel.app", process.env.FRONTEND_URL], // Apna production URL env mein daal dena
  credentials: true 
}));

app.use(express.json());
app.use(morgan('dev'));


connectDB();


app.get('/', (req, res) => {
  res.send('Admin Panel API is running on Vercel Serverless!');
});


app.use("/api/user", userRouter);
app.use("/api/bid", bidRouter);
app.use("/api/market", marketRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/chat", chatRouter);

const PORT = process.env.PORT || 5000;


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}


export default app;