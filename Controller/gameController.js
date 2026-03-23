import User from "../models/User.js";
import Result from "../models/Result.js";
import Bid from "../models/Bid.js";
import Market from "../models/Market.js";
import Notification from "../models/Notification.js";



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

        const open_digit = calculateDigit(open_panna);
        const close_digit = calculateDigit(close_panna);

        // Date bounds
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch or create Result
        let resultDoc = await Result.findOne({
            market_id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!resultDoc) {
            resultDoc = new Result({
                market_id,
                date: new Date(date),
                open_panna: open_panna || '',
                open_digit: open_digit || '',
                close_panna: close_panna || '',
                close_digit: close_digit || '',
                jodi: ''
            });
        } else {
            if (open_panna) {
                resultDoc.open_panna = open_panna;
                resultDoc.open_digit = open_digit;
            }
            if (close_panna) {
                resultDoc.close_panna = close_panna;
                resultDoc.close_digit = close_digit;
            }
        }

        // recalculate Jodi if both exist
        if (resultDoc.open_digit && resultDoc.close_digit) {
            resultDoc.jodi = `${resultDoc.open_digit}${resultDoc.close_digit}`;
        }
        await resultDoc.save();

        // Update the Market's live result display
        const marketDoc = await Market.findById(market_id);
        if (marketDoc) {
            if (resultDoc.open_panna) marketDoc.open_pana = resultDoc.open_panna;
            if (resultDoc.close_panna) marketDoc.close_pana = resultDoc.close_panna;

            const liveOD = resultDoc.open_digit || '*';
            const liveCD = resultDoc.close_digit || '*';
            marketDoc.jodi_result = `${liveOD}${liveCD}`;
            if (resultDoc.open_panna && resultDoc.close_panna) {
                marketDoc.status = 'Closed'; 
            }

            await marketDoc.save();
        }
        try {
            const autoNotification = new Notification({
                title: `🎉 ${marketDoc.name} Result Declared!`,
                message: `Today's result for ${marketDoc.name} has been updated: ${resultDoc.open_panna || '***'} - ${resultDoc.jodi || '**'} - ${resultDoc.close_panna || '***'}. Check your wallet now!`,
                type: 'Result'
            });
            await autoNotification.save();
            console.log(`Notification sent for ${marketDoc.name}`);
        } catch (notifErr) {
            console.error("Failed to generate automatic notification:", notifErr);
        }
        

        const payouts = {
            'Single': 9,
            'Jodi': 90,
            'Single Panna': 140,
            'Double Panna': 280,
            'Triple Panna': 600,
            'Half Sangam': 1000,
            'Full Sangam': 10000
        };

        const pendingBets = await Bid.find({
            status: 'Pending',
            market_id: market_id,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        let winnersCount = 0;
        let totalPayout = 0;

        for (let bet of pendingBets) {
            let isWinner = false;
            let shouldProcess = false;

            switch (bet.game_type) {
                case 'Single':
                    if (bet.session === 'Open' && resultDoc.open_digit) {
                        shouldProcess = true;
                        if (bet.bet_number === resultDoc.open_digit) isWinner = true;
                    }
                    if (bet.session === 'Close' && resultDoc.close_digit) {
                        shouldProcess = true;
                        if (bet.bet_number === resultDoc.close_digit) isWinner = true;
                    }
                    break;

                case 'Jodi':
                    if (resultDoc.jodi) {
                        shouldProcess = true;
                        if (bet.bet_number === resultDoc.jodi) isWinner = true;
                    }
                    break;

                case 'Single Panna':
                case 'Double Panna':
                case 'Triple Panna':
                    if (bet.session === 'Open' && resultDoc.open_panna) {
                        shouldProcess = true;
                        if (bet.bet_number === resultDoc.open_panna) isWinner = true;
                    }
                    if (bet.session === 'Close' && resultDoc.close_panna) {
                        shouldProcess = true;
                        if (bet.bet_number === resultDoc.close_panna) isWinner = true;
                    }
                    break;

                case 'Half Sangam':
                    if (resultDoc.open_panna && resultDoc.close_digit) {
                        shouldProcess = true;
                        if (bet.bet_number === `${resultDoc.open_panna}-${resultDoc.close_digit}`) isWinner = true;
                    }
                    if (resultDoc.close_panna && resultDoc.open_digit) {
                        shouldProcess = true;
                        if (bet.bet_number === `${resultDoc.close_panna}-${resultDoc.open_digit}`) isWinner = true;
                    }
                    break;

                case 'Full Sangam':
                    if (resultDoc.open_panna && resultDoc.close_panna) {
                        shouldProcess = true;
                        if (bet.bet_number === `${resultDoc.open_panna}-${resultDoc.close_panna}`) isWinner = true;
                    }
                    break;

                case 'Odd Even':
                    if (bet.session === 'Open' && resultDoc.open_digit) {
                        shouldProcess = true;
                        const isTargetEven = parseInt(resultDoc.open_digit) % 2 === 0;
                        if (bet.bet_number === 'Even' && isTargetEven) isWinner = true;
                        if (bet.bet_number === 'Odd' && !isTargetEven) isWinner = true;
                    }
                    if (bet.session === 'Close' && resultDoc.close_digit) {
                        shouldProcess = true;
                        const isTargetEven = parseInt(resultDoc.close_digit) % 2 === 0;
                        if (bet.bet_number === 'Even' && isTargetEven) isWinner = true;
                        if (bet.bet_number === 'Odd' && !isTargetEven) isWinner = true;
                    }
                    break;
            }

            if (shouldProcess) {
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
        }

        res.status(200).json({
            message: "Result processed and payouts calculated!",
            result: resultDoc,
            stats: { totalBidsProcessed: pendingBets.length, winnersCount, totalPayout }
        });

    } catch (error) {
        console.error("Result Logic Error:", error);
        res.status(500).json({ message: "Server error calculating results." });
    }
};