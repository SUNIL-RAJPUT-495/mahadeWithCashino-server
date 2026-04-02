import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  active_days: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6]
  },
  // Bid Timings
  open_time: {
    type: String,
    required: true
  },
  close_time: {
    type: String,
    required: true
  },

  open_result_time: {
    type: String,
    default: ''
  },
  close_result_time: {
    type: String,
    default: ''
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