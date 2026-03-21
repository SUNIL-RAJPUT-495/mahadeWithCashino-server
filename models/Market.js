import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, // e.g., "Kalyan", "Milan Day"
  open_time: { 
    type: String, 
    required: true 
  }, // e.g., "10:00 AM"
  close_time: { 
    type: String, 
    required: true 
  }, // e.g., "12:00 PM"
  status: { 
    type: String, 
    enum: ['Active', 'Closed'], 
    default: 'Active' 
  } // Admin game ko on/off kar sake
}, { timestamps: true });

export default mongoose.model('Market', marketSchema);