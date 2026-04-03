import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect("mongodb://localhost:27017/mahadev_project") // Assuming localhost
  .then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    console.log(JSON.stringify(users.map(u => ({ id: u._id, mobile: u.mobile, wallet: u.wallet, walletBalance: u.walletBalance })), null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
