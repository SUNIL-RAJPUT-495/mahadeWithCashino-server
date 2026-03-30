import mongoose from 'mongoose';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// --- HELPER FUNCTIONS ---
const isSinglePanna = (panna) => panna && new Set(panna.split('')).size === 3;
const isDoublePanna = (panna) => panna && new Set(panna.split('')).size === 2;
const isTriplePanna = (panna) => panna && new Set(panna.split('')).size === 1;

const isCyclePanaWin = (betNum, resultNum) => {
    if (!resultNum || resultNum.length !== 3) return false;
    const rotations = [
        resultNum,
        resultNum[1] + resultNum[2] + resultNum[0],
        resultNum[2] + resultNum[0] + resultNum[1]
    ];
    return rotations.includes(betNum);
};

const isFamilyPanelWin = (betNum, resultNum) => {
    if (!resultNum || !betNum) return false;
    return betNum.split('').sort().join('') === resultNum.split('').sort().join('');
};

const isMotorWin = (motorDigits, resultPanna) => {
    if (!resultPanna || !motorDigits) return false;
    return resultPanna.split('').every(digit => motorDigits.includes(digit));
};

const PAYOUT_RATES = {
    'Single': 10,
    'SingleBulk': 10,
    'Jodi': 100,
    'JodiBulk': 100,
    'Single Panna': 160,
    'SinglePannaBulk': 160,
    'Double Panna': 320,
    'DoublePannaBulk': 320,
    'Triple Panna': 700,
    'FullSangam': 10000,
    'HalfSangamA': 1000,
    'HalfSangamB': 1000,
    'SP': 10, 
    'DP': 100, 
    'TP': 700,
    'TwoDigitPana': 100,
    'SPMotor': 160,
    'DPMotor': 320,
    'RedJodi': 100,
    'OddEven': 2,
    'SPCOMMON': 10,
    'DPCOMMON': 100,
};

// --- SETTLEMENT LOGIC ---
export const runSettlementLogic = async (marketId, resultDoc, sessionType) => {
    try {
        console.log(`[SETTLEMENT] Started for Market: ${marketId} | Session: ${sessionType}`);

        const resultDate = resultDoc.date ? new Date(resultDoc.date) : new Date();
        const startOfDay = new Date(resultDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(resultDate); endOfDay.setHours(23, 59, 59, 999);

        console.log(`[SETTLEMENT] Filtering bids between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

        const bidCursor = Bid.find({
            market_id: marketId,
            status: 'Pending',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).cursor();

        let processedCount = 0;

        for await (const bid of bidCursor) {
            if (sessionType === 'Open' && bid.session !== 'Open') continue;
            if (sessionType === 'Close' && !['Close', 'Full'].includes(bid.session)) continue;

            let isWinner = false;
            let resultPannaToMatch = bid.session === 'Open' ? resultDoc.open_panna : resultDoc.close_panna;
            let resultDigitToMatch = bid.session === 'Open' ? resultDoc.open_digit : resultDoc.close_digit;

            switch (bid.game_type) {
                case 'Single':
                case 'SingleBulk':
                    if (bid.bet_number === resultDigitToMatch) isWinner = true;
                    break;

                // 2. Jodi
                case 'Jodi':
                case 'JodiBulk':
                    if (bid.bet_number === resultDoc.jodi) isWinner = true;
                    break;

                // 3. Single Panna & its variants
                case 'Single Panna':
                case 'SinglePannaBulk':
                case 'SP':
                case 'SPCOMMON':
                    if (isSinglePanna(resultPannaToMatch) && bid.bet_number === resultPannaToMatch) isWinner = true;
                    break;

                case 'Double Panna':
                case 'DoublePannaBulk':
                case 'DP':
                case 'DPCOMMON':
                    if (isDoublePanna(resultPannaToMatch) && bid.bet_number === resultPannaToMatch) isWinner = true;
                    break;

                case 'Triple Panna':
                case 'TP':
                    if (isTriplePanna(resultPannaToMatch) && bid.bet_number === resultPannaToMatch) isWinner = true;
                    break;

                case 'SPMotor':
                    if (isSinglePanna(resultPannaToMatch) && isMotorWin(bid.bet_number, resultPannaToMatch)) isWinner = true;
                    break;

                case 'DPMotor':
                    if (isDoublePanna(resultPannaToMatch) && isMotorWin(bid.bet_number, resultPannaToMatch)) isWinner = true;
                    break;

                case 'OddEven': 
                    let digitNum = parseInt(resultDigitToMatch);
                    if (!isNaN(digitNum)) {
                        let isEven = digitNum % 2 === 0;
                        if ((bid.bet_number.toLowerCase() === 'even' && isEven) ||
                            (bid.bet_number.toLowerCase() === 'odd' && !isEven)) {
                            isWinner = true;
                        }
                    }
                    break;

                case 'RedJodi': 
                    const redList = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99']; 
                    if (redList.includes(resultDoc.jodi) && bid.bet_number === resultDoc.jodi) isWinner = true;
                    break;

                case 'TwoDigitPana':
                    if (resultPannaToMatch && bid.bet_number.length === 2) {
                        let pannaChars = resultPannaToMatch.split('');
                        let betChars = bid.bet_number.split('');
                        let matchCount = 0;
                        
                        for (let char of betChars) {
                            let idx = pannaChars.indexOf(char);
                            if (idx !== -1) {
                                matchCount++;
                                pannaChars.splice(idx, 1); 
                            }
                        }
                        if (matchCount === 2) isWinner = true;
                    }
                    break;

                case 'HalfSangamA':
                    let sangamA_Match = `${resultDoc.open_panna}-${resultDoc.close_digit}`;
                    if (bid.bet_number === sangamA_Match) isWinner = true;
                    break;

                case 'HalfSangamB': 
                    let sangamB_Match = `${resultDoc.open_digit}-${resultDoc.close_panna}`;
                    if (bid.bet_number === sangamB_Match) isWinner = true;
                    break;

                case 'FullSangam': 
                    let fullSangam_Match = `${resultDoc.open_panna}-${resultDoc.close_panna}`;
                    if (bid.bet_number === fullSangam_Match) isWinner = true;
                    break;

                case 'Cycle Pana': 
                    if (isCyclePanaWin(bid.bet_number, resultPannaToMatch)) isWinner = true;
                    break;

                case 'Family Panel': 
                    if (isFamilyPanelWin(bid.bet_number, resultPannaToMatch)) isWinner = true;
                    break;
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                if (isWinner) {
                    const rate = PAYOUT_RATES[bid.game_type] || 0;
                    const winningAmount = bid.amount * rate;

                    await User.findByIdAndUpdate(bid.user_id, { $inc: { walletBalance: winningAmount } }, { session });

                    await Bid.findByIdAndUpdate(bid._id, { status: 'Winner', wonAmount: winningAmount }, { session });

                    await Transaction.create([{
                        userId: bid.user_id,
                        amount: winningAmount,
                        type: 'Win',
                        remark: `Won in ${bid.game_type} (${bid.session}) - Number: ${bid.bet_number}`,
                        method: 'System',
                        status: 'Approved'
                    }], { session });

                } else {
                    await Bid.findByIdAndUpdate(bid._id, { status: 'Loser', wonAmount: 0 }, { session });
                }

                await session.commitTransaction();
                processedCount++;

            } catch (error) {
                await session.abortTransaction();
                console.error(`[SETTLEMENT] Failed for Bid ID ${bid._id}:`, error);
            } finally {
                session.endSession();
            }
        }

        console.log(`[SETTLEMENT] Successfully processed ${processedCount} bids for ${sessionType} session.`);

    } catch (criticalError) {
        console.error(`[SETTLEMENT] CRITICAL ERROR in Market ${marketId}:`, criticalError);
    }
};