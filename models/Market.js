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
  open_pana: {
    type: String,
    default: '***' // Default value jab tak result na aaye
  },
  jodi_result: {
    type: String,
    default: '**' // Middle result
  },
  close_pana: {
    type: String,
    default: '***' // Default value
  },
  status: { 
    type: String, 
    enum: ['Active', 'Closed'], 
    default: 'Active' 
  } // Admin game ko on/off kar sake
}, { timestamps: true });

export default mongoose.model('Market', marketSchema);