import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
    minDeposit: { 
        type: Number,
         default: 200 
        },
    minWithdrawal: { 
        type: Number, 
        default: 500 
    },
    signupBonus: { 
        type: Number, 
        default: 500 
    },
    referralBonus: { 
        type: Number, 
        default: 25 
    },
    referredBonus: { 
        type: Number, 
        default: 25 
    },
    maxReferrals: { 
        type: Number, 
        default: 50 
    },
    isPercentage: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);