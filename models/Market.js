import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, 
  
  // Bid Timings
  open_time: { 
    type: String, 
    required: true // Yeh "Open Bid Last Time" hai
  }, 
  close_time: { 
    type: String, 
    required: true // Yeh "Close Bid Last Time" hai
  }, 
  
  // Result Timings (✨ Naye Fields Screenshot ke hisaab se)
  open_result_time: {
    type: String,
    default: '' // Example: "09:35 AM"
  },
  close_result_time: {
    type: String,
    default: '' // Example: "10:35 AM"
  },

  // Results
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