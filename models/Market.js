import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, 
  open_time: { 
    type: String, 
    required: true 
  }, 
  close_time: { 
    type: String, 
    required: true 
  }, 
  open_pana: {
    type: String,
    default: '***' 
  },
  jodi_result: {
    type: String,
    default: '**' 
  },
  close_pana: {
    type: String,
    default: '***' 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Closed'], 
    default: 'Active' 
  } 
}, { timestamps: true });

export default mongoose.model('Market', marketSchema);