import User from "../models/User.js";
import Result from "../models/Result.js";
import Bid from "../models/Bid.js";
import Market from "../models/Market.js";



export const addGame = async (req, res) => {
    try {
        const name = req.body?.name ?? req.body?.Name;
        const open_time = req.body?.open_time ?? req.body?.OpeningTime;
        const close_time = req.body?.close_time ?? req.body?.ClosingTime;

        if (!name || !open_time || !close_time) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const existingGame = await Market.findOne({ name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
        }

        // Market schema expects: { name, open_time, close_time }
        const game = await Market.create({ name, open_time, close_time });
        res.status(201).json({ message: 'Game added successfully', game });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getAllGames = async (req, res) => {
    try {
        const games = await Market.find();
        res.status(200).json({ games });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


export const placeBid = async (req, res) => {
    try {
        const user_id = req.userId;
        const { market_id, game_type, session, bet_number, amount } = req.body;

        // 1. Basic Validation
        if (!market_id || !game_type || !session || !bet_number || !amount) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // 2. Strict Number Validation (Positive Integers Only)
        const bidAmount = Number(amount);
        if (isNaN(bidAmount) || bidAmount <= 0 || !Number.isInteger(bidAmount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive whole number.' });
        }

        // 3. User Check
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status === 'Blocked') {
            return res.status(403).json({ message: 'Your account is blocked. Contact Admin.' });
        }

        if (user.walletBalance < bidAmount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        // 4. Market Check
        const market = await Market.findById(market_id);
        if (!market) {
            return res.status(404).json({ message: 'Market not found' });
        }

        const bid = await Bid.create({
            user_id,
            market_id,
            game_type,
            session,
            bet_number,
            amount: bidAmount
        });

        user.walletBalance -= bidAmount;
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Bid placed successfully',
            bid,
            updatedBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Bid Controller Error:", error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


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
        const { user_id } = req.body;
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



export const declareResult = async (req, res) => {
    try {
        const { market_id, date, open_panna, close_panna } = req.body;

        const calculateDigit = (panna) => {
            if (!panna || panna.length !== 3) return '';
            const sum = parseInt(panna[0]) + parseInt(panna[1]) + parseInt(panna[2]);
            return (sum % 10).toString();
        };
        // 1. Calculate Digits and Jodi
        const open_digit = calculateDigit(open_panna); // e.g., 456 -> 4+5+6=15 -> 5
        const close_digit = calculateDigit(close_panna); // e.g., 779 -> 7+7+9=23 -> 3[cite: 1]
        const jodi = `${open_digit}${close_digit}`; // e.g., 53[cite: 1]

        // 2. Save Result to DB[cite: 1]
        const newResult = new Result({
            market_id,
            open_panna,
            open_digit,
            close_panna,
            close_digit,
            jodi,
            date: new Date(date)
        });
        await newResult.save();

        // 3. Payout Multipliers (10 ki bet par kitna milega / 10)[cite: 1]
        const payouts = {
            'Single': 9,          // 10 -> 90[cite: 1]
            'Jodi': 90,           // 10 -> 900[cite: 1]
            'Single Panna': 140,  // 10 -> 1400[cite: 1]
            'Double Panna': 280,  // 10 -> 2800[cite: 1]
            'Triple Panna': 600,  // 10 -> 6000[cite: 1]
            // Sangam payouts aap apne hisaab se add kar sakte hain (usually 10 -> 10000 for Full)
            'Half Sangam': 1000,
            'Full Sangam': 10000
        };

        // 4. Find all pending bets for this date/market
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const pendingBets = await Bet.find({
            status: 'Pending',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
            // market_id: market_id // Agar multiple markets filter karne hain
        });

        let winnersCount = 0;
        let totalPayout = 0;

        for (let bet of pendingBets) {
            let isWinner = false;

            switch (bet.game_type) {
                case 'Single':
                    if (bet.session === 'Open' && bet.bet_number === open_digit) isWinner = true;
                    if (bet.session === 'Close' && bet.bet_number === close_digit) isWinner = true;
                    break;

                case 'Jodi':
                    if (bet.bet_number === jodi) isWinner = true;
                    break;

                case 'Single Panna':
                case 'Double Panna':
                case 'Triple Panna':
                    // Match panna depending on session[cite: 1]
                    if (bet.session === 'Open' && bet.bet_number === open_panna) isWinner = true;
                    if (bet.session === 'Close' && bet.bet_number === close_panna) isWinner = true;
                    break;

                case 'Half Sangam':
                    if (bet.bet_number === `${open_panna}-${close_digit}`) isWinner = true;
                    if (bet.bet_number === `${close_panna}-${open_digit}`) isWinner = true;
                    break;

                case 'Full Sangam':
                    if (bet.bet_number === `${open_panna}-${close_panna}`) isWinner = true;
                    break;

                case 'Odd Even':
                    const targetDigit = bet.session === 'Open' ? parseInt(open_digit) : parseInt(close_digit);
                    const isTargetEven = targetDigit % 2 === 0;
                    if (bet.bet_number === 'Even' && isTargetEven) isWinner = true;
                    if (bet.bet_number === 'Odd' && !isTargetEven) isWinner = true;
                    break;
            }

            // 6. Process Winner/Loser
            if (isWinner) {
                bet.status = 'Winner';
                const multiplier = payouts[bet.game_type] || 1;
                const winAmount = bet.amount * multiplier;


                await User.findByIdAndUpdate(bet.user_id, { $inc: { walletBalance: winAmount } });

                winnersCount++;
                totalPayout += winAmount;
            } else {
                bet.status = 'Loser';
            }

            await bet.save();
        }

        res.status(200).json({
            message: "Result generated and winnings distributed!",
            result: { open_panna, open_digit, close_panna, close_digit, jodi },
            stats: { totalBidsProcessed: pendingBets.length, winnersCount, totalPayout }
        });

    } catch (error) {
        console.error("Result Logic Error:", error);
        res.status(500).json({ message: "Server error calculating results." });
    }
};