import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  email: {
    type: String,
    lowercase: true
  },
  mobile: {
    type: String,
    required: [true, "Mobile number is required"],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
 wallet: {
    realBalance: {
      type: Number,
      default: 0,
      description: "Money deposited or won by the user"
    },
    bonusBalance: {
      type: Number,
      default: 0,
      description: "Bonus money from referrals or signup"
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['Active', 'Blocked'],
    default: 'Active'
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: String,
    default: null
  },
}, { timestamps: true });
userSchema.pre('save', async function () {
  if (this.role !== 'admin') {
    return;
  }

  const existingAdmin = await this.constructor.findOne({ role: 'admin' });

  if (existingAdmin && existingAdmin._id.toString() !== this._id.toString()) {
    throw new Error("Validation Error: Only one admin is allowed");
  }
});
export default mongoose.model('User', userSchema);