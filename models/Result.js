import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  market_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Market',required: true },
  open_panna: { type: String },
  open_digit: { type: String },
  close_panna: { type: String },
  close_digit: { type: String },
  jodi: { type: String },
  date: { type: Date, required: true }
}, { timestamps: true });
resultSchema.index({ market_id: 1, date: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);