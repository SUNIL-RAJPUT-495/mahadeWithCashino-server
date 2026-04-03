import mongoose from 'mongoose';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';



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
    'Single': 10, 'SingleBulk': 10,
    'Jodi': 100, 'JodiBulk': 100,
    'Single Panna': 160, 'SinglePannaBulk': 160,
    'Double Panna': 320, 'DoublePannaBulk': 320,
    'Triple Panna': 700,
    'FullSangam': 10000,
    'HalfSangamA': 1000, 'HalfSangamB': 1000,
    'SP': 10, 'DP': 100, 'TP': 700,
    'TwoDigitPana': 100,
    'SPMotor': 160, 'DPMotor': 320,
    'RedJodi': 100,
    'OddEven': 2,
    'SPCOMMON': 10, 'DPCOMMON': 100,
};

// ==========================================
// 2. INDIVIDUAL GAME CHECKERS 
// ==========================================

const checkSingleWin = (betNum, resultDigit) => betNum === resultDigit;

const checkJodiWin = (betNum, _, __, resultDoc) => betNum === resultDoc.jodi;

const checkSinglePannaWin = (betNum, _, resultPanna) => isSinglePanna(resultPanna) && betNum === resultPanna;

const checkDoublePannaWin = (betNum, _, resultPanna) => isDoublePanna(resultPanna) && betNum === resultPanna;

const checkTriplePannaWin = (betNum, _, resultPanna) => isTriplePanna(resultPanna) && betNum === resultPanna;

const checkSPMotorWin = (betNum, _, resultPanna) => isSinglePanna(resultPanna) && isMotorWin(betNum, resultPanna);

const checkDPMotorWin = (betNum, _, resultPanna) => isDoublePanna(resultPanna) && isMotorWin(betNum, resultPanna);

const checkOddEvenWin = (betNum, resultDigit) => {
    let digitNum = parseInt(resultDigit);
    if (!isNaN(digitNum)) {
        let isEven = digitNum % 2 === 0;
        return (betNum.toLowerCase() === 'even' && isEven) || (betNum.toLowerCase() === 'odd' && !isEven);
    }
    return false;
};

const checkRedJodiWin = (betNum, _, __, resultDoc) => {
    const redList = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
    return redList.includes(resultDoc.jodi) && betNum === resultDoc.jodi;
};

const checkTwoDigitPanaWin = (betNum, _, resultPanna) => {
    if (resultPanna && betNum.length === 2) {
        let pannaChars = resultPanna.split('');
        let betChars = betNum.split('');
        let matchCount = 0;
        for (let char of betChars) {
            let idx = pannaChars.indexOf(char);
            if (idx !== -1) {
                matchCount++;
                pannaChars.splice(idx, 1);
            }
        }
        return matchCount === 2;
    }
    return false;
};

const checkHalfSangamAWin = (betNum, _, __, resultDoc) => betNum === `${resultDoc.open_panna}-${resultDoc.close_digit}`;
const checkHalfSangamBWin = (betNum, _, __, resultDoc) => betNum === `${resultDoc.open_digit}-${resultDoc.close_panna}`;
const checkFullSangamWin = (betNum, _, __, resultDoc) => betNum === `${resultDoc.open_panna}-${resultDoc.close_panna}`;
const checkCyclePanaWin = (betNum, _, resultPanna) => isCyclePanaWin(betNum, resultPanna);
const checkFamilyPanelWin = (betNum, _, resultPanna) => isFamilyPanelWin(betNum, resultPanna);


// ==========================================
// 3. THE WIN ENGINE (Router)
// Yahan game_type connect hota hai sahi function se
// ==========================================
const GameWinEngine = {
    'Single': checkSingleWin, 'SingleBulk': checkSingleWin,
    'Jodi': checkJodiWin, 'JodiBulk': checkJodiWin,
    'Single Panna': checkSinglePannaWin, 'SinglePannaBulk': checkSinglePannaWin, 'SP': checkSinglePannaWin, 'SPCOMMON': checkSinglePannaWin,
    'Double Panna': checkDoublePannaWin, 'DoublePannaBulk': checkDoublePannaWin, 'DP': checkDoublePannaWin, 'DPCOMMON': checkDoublePannaWin,
    'Triple Panna': checkTriplePannaWin, 'TP': checkTriplePannaWin,
    'SPMotor': checkSPMotorWin,
    'DPMotor': checkDPMotorWin,
    'OddEven': checkOddEvenWin,
    'RedJodi': checkRedJodiWin,
    'TwoDigitPana': checkTwoDigitPanaWin,
    'HalfSangamA': checkHalfSangamAWin,
    'HalfSangamB': checkHalfSangamBWin,
    'FullSangam': checkFullSangamWin,
    'Cycle Pana': checkCyclePanaWin,
    'Family Panel': checkFamilyPanelWin
};


// ==========================================
// 4. MAIN SETTLEMENT LOGIC (Ab ekdum clean ho gaya hai)
// ==========================================
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
            // 1. Session Check
            if (sessionType === 'Open' && bid.session !== 'Open') continue;
            if (sessionType === 'Close' && !['Close', 'Full'].includes(bid.session)) continue;

            // 2. Fetch required target values based on session
            let resultPannaToMatch = bid.session === 'Open' ? resultDoc.open_panna : resultDoc.close_panna;
            let resultDigitToMatch = bid.session === 'Open' ? resultDoc.open_digit : resultDoc.close_digit;

            let isWinner = false;

            // 👉 3. ENGINE SE MAGIC CALCULATION 
            const checkWinFunction = GameWinEngine[bid.game_type];
            if (checkWinFunction) {
                isWinner = checkWinFunction(bid.bet_number, resultDigitToMatch, resultPannaToMatch, resultDoc);
            } else {
                console.error(`[SETTLEMENT WARNING] No checker found for game_type: ${bid.game_type}`);
            }

            // 4. Update Database safely with Transactions
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                if (isWinner) {
                    const rate = PAYOUT_RATES[bid.game_type] || 0;
                    const winningAmount = bid.amount * rate;

                    await User.findByIdAndUpdate(bid.user_id, { $inc: { 'wallet.realBalance': winningAmount } }, { session });
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