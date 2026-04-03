import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['General', 'Alert', 'Result', 'Bonus'], 
    default: 'General'
  },
  /** null / missing = sab users ko dikhe; set ho to sirf us user ko */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);