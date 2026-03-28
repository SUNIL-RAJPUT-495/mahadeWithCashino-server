import User from "../models/User.js";
import Market from "../models/Market.js";
import Bid from "../models/Bid.js";

const normalizeGameType = (type) => {
    if (!type) return type;
    if (type === 'SingleBulk' || type === 'SinglePannaBulk' || type === 'DoublePannaBulk') {
        if (type === 'SingleBulk') return 'Single';
        if (type === 'SinglePannaBulk') return 'Single Panna';
        if (type === 'DoublePannaBulk') return 'Double Panna';
    }
    return type;
};

const generateSPMotor = (motor) => {
    let digits = Array.from(new Set(motor.split(''))).sort();
    let panas = [];
    for (let i = 0; i < digits.length; i++) {
        for (let j = i + 1; j < digits.length; j++) {
            for (let k = j + 1; k < digits.length; k++) {
                panas.push(digits[i] + digits[j] + digits[k]);
            }
        }
    }
    return panas;
};

const generateDPMotor = (motor) => {
    let digits = Array.from(new Set(motor.split(''))).sort();
    let panas = [];
    for (let i = 0; i < digits.length; i++) {
        for (let j = 0; j < digits.length; j++) {
            if (i !== j) {
                let p = [digits[i], digits[i], digits[j]].sort().join('');
                if (!panas.includes(p)) panas.push(p);
            }
        }
    }
    return panas;
};


export const placeBid = async (req, res) => {
    try {
        const user_id = req.userId;
        const { market_id, game_type, session, bet_number, amount, total_amount, bids } = req.body;

        // 1. User Check First
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status === 'Blocked') {
            return res.status(403).json({ message: 'Your account is blocked. Contact Admin.' });
        }

        // 2. Market Check
        const market = await Market.findById(market_id);
        if (!market) {
            return res.status(404).json({ message: 'Market not found' });
        }

        let incomingBids = [];
        if (bids && Array.isArray(bids) && bids.length > 0) {
            incomingBids = bids;
        } else if (bet_number && amount && session) {
            incomingBids = [{ session, bet_number, amount }];
        } else {
            return res.status(400).json({ message: 'Invalid bid data.' });
        }

        if (market.status === 'Closed') {
            return res.status(400).json({ message: 'Market is closed for betting.' });
        }

        const getISTTime = () => {
            const date = new Date();
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const istDate = new Date(utc + (330 * 60000));
            const hours = String(istDate.getHours()).padStart(2, '0');
            const minutes = String(istDate.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        const currentTime = getISTTime();

        const isPastSessionTime = (currTime, sessTime, sessType, openTm, closeTm) => {
            const crossesMidnight = openTm > closeTm;
            if (crossesMidnight) {
                const isAM = currTime >= "00:00" && currTime < "12:00";
                if (sessType === 'Open' || sessType === 'Full') {
                    if (isAM) return true;
                    return currTime > sessTime;
                } else if (sessType === 'Close') {
                    if (isAM) return currTime > sessTime;
                    return false;
                }
            } 
            return currTime > sessTime;
        };

        for (let b of incomingBids) {
            let sessionTime = (b.session === 'Open' || b.session === 'Full') ? market.open_time : market.close_time;
            
            if (sessionTime && isPastSessionTime(currentTime, sessionTime, b.session, market.open_time, market.close_time)) {
                return res.status(400).json({ message: `Betting is closed for ${b.session === 'Full' ? 'Jodi' : b.session} session. Time limit was ${sessionTime}.` });
            }
        }

        // 3. Process & Expand Combinations
        let finalBidsToSave = [];
        let backendCalculatedTotalAmount = 0;

        for (let bid of incomingBids) {
            const bidAmt = Number(bid.amount);
            if (isNaN(bidAmt) || bidAmt < 10 || !Number.isInteger(bidAmt)) {
                return res.status(400).json({ message: 'Invalid amount. Minimum ₹10 required.' });
            }
            if (!bid.session || !bid.bet_number) {
                return res.status(400).json({ message: 'Session and bet number required.' });
            }

            const normalizedType = normalizeGameType(game_type);

            if (game_type === 'SPMotor') {
                const panas = generateSPMotor(bid.bet_number);
                for (let pana of panas) {
                    finalBidsToSave.push({ user_id, market_id, game_type: 'Single Panna', session: bid.session, bet_number: pana, amount: bidAmt });
                    backendCalculatedTotalAmount += bidAmt;
                }
            } else if (game_type === 'DPMotor') {
                const panas = generateDPMotor(bid.bet_number);
                for (let pana of panas) {
                    finalBidsToSave.push({ user_id, market_id, game_type: 'Double Panna', session: bid.session, bet_number: pana, amount: bidAmt });
                    backendCalculatedTotalAmount += bidAmt;
                }
            } else if (game_type === 'OddEven') {
                const digits = bid.bet_number === 'Odd' ? ['1', '3', '5', '7', '9'] : ['0', '2', '4', '6', '8'];
                for (let digit of digits) {
                    finalBidsToSave.push({ user_id, market_id, game_type: 'Single', session: bid.session, bet_number: digit, amount: bidAmt });
                    backendCalculatedTotalAmount += bidAmt;
                }
            } else {
                finalBidsToSave.push({ user_id, market_id, game_type: normalizedType, session: bid.session, bet_number: String(bid.bet_number), amount: bidAmt });
                backendCalculatedTotalAmount += bidAmt;
            }
        }

        // 4. Validate Balance & Execute
        if (finalBidsToSave.length === 0) return res.status(400).json({ message: 'No valid bets to place.' });
        if (user.walletBalance < backendCalculatedTotalAmount) return res.status(400).json({ message: 'Insufficient wallet balance.' });

        const createdBids = await Bid.insertMany(finalBidsToSave);
        user.walletBalance -= backendCalculatedTotalAmount;
        await user.save();

        return res.status(201).json({
            success: true,
            message: `Successfully placed ${finalBidsToSave.length} bids.`,
            total_deducted: backendCalculatedTotalAmount,
            updatedBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Bid Controller Error:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};








export const getAllBids = async (req, res) => {
    try {
        // .populate se hum User ka naam aur Game ki details khinch rahe hain
        const bids = await Bid.find()
            .populate('user_id', 'name mobile')
            .populate('market_id', 'name')
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json({ success: true, bids });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}




export const getUserBids = async (req, res) => {
    try {
        const user_id = req.userId;
        if (!user_id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await User.findById(user_id)


        const bids = await Bid.find({ user_id }).populate('market_id').sort({ createdAt: -1 });

        res.status(200).json({
            message: 'Bids fetched successfully',
            totalBids: bids.length,
            bids: bids
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


