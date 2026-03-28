import Market from "../models/Market.js";
import Result from "../models/Result.js";
import Bid from "../models/Bid.js";
import Notification from "../models/Notification.js";


export const addGame = async (req, res) => {
    try {
        // 1. Frontend se aane wale saare fields ko extract karein
        const name = req.body?.name ?? req.body?.Name;
        const open_time = req.body?.open_time ?? req.body?.OpeningTime;
        const close_time = req.body?.close_time ?? req.body?.ClosingTime;
        
        // ✨ Naye result timings extract karein
        const open_result_time = req.body?.open_result_time;
        const close_result_time = req.body?.close_result_time;

        // 2. Validation: Check karein ki koi field khaali toh nahi hai
        if (!name || !open_time || !close_time || !open_result_time || !close_result_time) {
            return res.status(400).json({ 
                message: 'All fields (Name and 4 Timings) are required' 
            });
        }

        // 3. Duplicate game check
        const existingGame = await Market.findOne({ name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
        }

        // 4. Database mein save karein (saare naye fields ke saath)
        const game = await Market.create({ 
            name, 
            open_time, 
            close_time,
            open_result_time,    // Naya field
            close_result_time    // Naya field
        });

        res.status(201).json({ message: 'Game added successfully', game });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
// Naya Helper Function: Yeh AM/PM wale time ko sahi se 24-hour mein badlega
const parseTime = (timeString) => {
    if (!timeString) return [0, 0];
    
    const cleanStr = timeString.trim().toUpperCase();
    
    // Agar time mein AM/PM likha hai
    if (cleanStr.includes('AM') || cleanStr.includes('PM')) {
        const [time, period] = cleanStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return [hours, minutes];
    }
    
    // Agar time pehle se "14:30" format mein hai
    return cleanStr.split(':').map(Number); 
};

export const getAllGames = async (req, res) => {
    try {
        const games = await Market.find().lean(); 

        // 1. Current IST time nikalein
        const currentTime = new Date();
        const istOptions = { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric', minute: 'numeric' };
        const istTimeStr = currentTime.toLocaleTimeString('en-US', istOptions); 
        const [currentHours, currentMinutes] = istTimeStr.split(':').map(Number);

        // 2. Har game ka time check karein
        const gamesWithStatus = games.map((game) => {
            let currentStatus = 'Active'; // Default status

            if (game.open_time && game.close_time) {
                // Yahan hum apna naya function use kar rahe hain jo AM/PM samajhta hai
                const [openHours, openMinutes] = parseTime(game.open_time);
                const [closeHours, closeMinutes] = parseTime(game.close_time);

                // Check: Agar current time Close Time ke aage nikal gaya hai -> CLOSED
                if (currentHours > closeHours || (currentHours === closeHours && currentMinutes >= closeMinutes)) {
                    currentStatus = 'Closed';
                } 
                // Check: Agar current time Open Time se pehle ka hai -> UPCOMING (optional)
                else if (currentHours < openHours || (currentHours === openHours && currentMinutes < openMinutes)) {
                    currentStatus = 'Upcoming';
                }
            }

            return {
                ...game,
                is_closed: currentStatus === 'Closed',
                status: currentStatus 
            };
        });

        // Backend se data frontend ko bhej rahe hain
        res.status(200).json({ data: gamesWithStatus }); 
        
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

        const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

        // 1. Result Update
        let resultDoc = await Result.findOne({ market_id, date: { $gte: startOfDay, $lte: endOfDay } });

        if (!resultDoc) {
            resultDoc = new Result({
                market_id, date: new Date(date),
                open_panna: open_panna || '', open_digit: open_digit || '',
                close_panna: close_panna || '', close_digit: close_digit || '', jodi: ''
            });
        } else {
            if (open_panna) { resultDoc.open_panna = open_panna; resultDoc.open_digit = open_digit; }
            if (close_panna) { resultDoc.close_panna = close_panna; resultDoc.close_digit = close_digit; }
        }

        if (resultDoc.open_digit && resultDoc.close_digit) {
            resultDoc.jodi = `${resultDoc.open_digit}${resultDoc.close_digit}`;
        }
        await resultDoc.save();

        // 2. Market Live Update
        const marketDoc = await Market.findById(market_id);
        if (marketDoc) {
            if (resultDoc.open_panna) marketDoc.open_pana = resultDoc.open_panna;
            if (resultDoc.close_panna) marketDoc.close_pana = resultDoc.close_panna;
            marketDoc.jodi_result = `${resultDoc.open_digit || '*'}${resultDoc.close_digit || '*'}`;
            if (resultDoc.open_panna && resultDoc.close_panna) marketDoc.status = 'Closed'; 
            await marketDoc.save();
        }

        // 3. Notification
        try {
            await Notification.create({
                title: `🎉 ${marketDoc.name} Result Declared!`,
                message: `Today's result: ${resultDoc.open_panna || '***'}-${resultDoc.jodi || '**'}-${resultDoc.close_panna || '***'}. Check your wallet!`,
                type: 'Result'
            });
        } catch (e) { console.error(e); }

        // 4. Batch Process Winners
        const payouts = {
            'Single': 9, 'Jodi': 90, 'Single Panna': 140, 'Double Panna': 280,
            'Triple Panna': 600, 'Half Sangam': 1000, 'Full Sangam': 10000
        };

        const pendingBets = await Bid.find({
            status: 'Pending', market_id, createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        let winnersCount = 0;
        let totalPayout = 0;
        const bidBulkOps = [];
        const userWalletUpdates = {};

        for (let bet of pendingBets) {
            let isWinner = false;
            let shouldProcess = false;

            // Winner Calculation Switch
            switch (bet.game_type) {
                case 'Single':
                    if (bet.session === 'Open' && resultDoc.open_digit) {
                        shouldProcess = true; if (bet.bet_number === resultDoc.open_digit) isWinner = true;
                    }
                    if (bet.session === 'Close' && resultDoc.close_digit) {
                        shouldProcess = true; if (bet.bet_number === resultDoc.close_digit) isWinner = true;
                    }
                    break;
                case 'Jodi':
                    if (resultDoc.jodi) {
                        shouldProcess = true; if (bet.bet_number === resultDoc.jodi) isWinner = true;
                    }
                    break;
                case 'Single Panna':
                case 'Double Panna':
                case 'Triple Panna':
                    if (bet.session === 'Open' && resultDoc.open_panna) {
                        shouldProcess = true; if (bet.bet_number === resultDoc.open_panna) isWinner = true;
                    }
                    if (bet.session === 'Close' && resultDoc.close_panna) {
                        shouldProcess = true; if (bet.bet_number === resultDoc.close_panna) isWinner = true;
                    }
                    break;
                case 'Half Sangam':
                    if (resultDoc.open_digit && resultDoc.close_panna && resultDoc.open_panna && resultDoc.close_digit) {
                        shouldProcess = true;
                        if (bet.bet_number === `${resultDoc.open_digit}-${resultDoc.close_panna}` || 
                            bet.bet_number === `${resultDoc.open_panna}-${resultDoc.close_digit}`) isWinner = true;
                    }
                    break;
                case 'Full Sangam':
                    if (resultDoc.open_panna && resultDoc.close_panna) {
                        shouldProcess = true;
                        if (bet.bet_number === `${resultDoc.open_panna}-${resultDoc.close_panna}`) isWinner = true;
                    }
                    break;
            }

            if (shouldProcess) {
                if (isWinner) {
                    const winAmount = bet.amount * (payouts[bet.game_type] || 1);
                    winnersCount++; totalPayout += winAmount;

                    bidBulkOps.push({ updateOne: { filter: { _id: bet._id }, update: { $set: { status: 'Winner', won_amount: winAmount } } } });
                    
                    if (!userWalletUpdates[bet.user_id]) userWalletUpdates[bet.user_id] = 0;
                    userWalletUpdates[bet.user_id] += winAmount;
                } else {
                    bidBulkOps.push({ updateOne: { filter: { _id: bet._id }, update: { $set: { status: 'Loser' } } } });
                }
            }
        }

        // 5. Execute DB Writes
        if (bidBulkOps.length > 0) await Bid.bulkWrite(bidBulkOps);
        
        const userBulkOps = Object.keys(userWalletUpdates).map(userId => ({
            updateOne: { filter: { _id: userId }, update: { $inc: { walletBalance: userWalletUpdates[userId] } } }
        }));
        if (userBulkOps.length > 0) await User.bulkWrite(userBulkOps);

        res.status(200).json({
            message: "Result processed!",
            result: resultDoc,
            stats: { totalBidsProcessed: bidBulkOps.length, winnersCount, totalPayout }
        });

    } catch (error) {
        console.error("Result Logic Error:", error);
        res.status(500).json({ message: "Server error calculating results." });
    }
};