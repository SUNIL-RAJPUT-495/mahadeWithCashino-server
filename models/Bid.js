import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    market_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market'
    },
    game_type: {
        type: String,
        required: true
    },
    session: {
        type: String,
        enum: ['Open', 'Close', 'Full']
    },
    bet_number: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Winner', 'Loser'],
        default: 'Pending'
    }
}, { timestamps: true });

export default mongoose.model('Bet', betSchema);