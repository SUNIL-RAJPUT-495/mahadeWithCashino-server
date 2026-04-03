import Market from "../models/Market.js";
import Result from "../models/Result.js";
import { parseTimeToMinutes, getCurrentISTMinutes, getISTDateKey } from "../utils/timeUtils.js";
import { runSettlementLogic } from "../services/settlementService.js";
import { resetDailyMarketDisplay } from "../jobs/resetMarketDisplay.js";
import { notifyResultDeclared } from "../utils/notificationHelper.js";


export const addGame = async (req, res) => {
    try {
        const name = req.body?.name ?? req.body?.Name;
        const open_time = req.body?.open_time ?? req.body?.OpeningTime;
        const close_time = req.body?.close_time ?? req.body?.ClosingTime;

        const open_result_time = req.body?.open_result_time;
        const close_result_time = req.body?.close_result_time;

        if (!name || !open_time || !close_time || !open_result_time || !close_result_time) {
            return res.status(400).json({
                message: 'All fields (Name and 4 Timings) are required'
            });
        }

        const existingGame = await Market.findOne({ name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
        }

        const game = await Market.create({
            name,
            open_time,
            close_time,
            open_result_time,
            close_result_time
        });

        res.status(201).json({ message: 'Game added successfully', game });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

/** Home card: sirf AAJ (IST) ke Result se number dikhao. Aaj ka Result na ho to Market me purana bhi na dikhe — *** / ** */
function applyTodayResultDisplay(game, todayResult) {
    if (!todayResult) {
        return {
            ...game,
            open_pana: '***',
            jodi_result: '**',
            close_pana: '***',
        };
    }
    const open_pana = todayResult.open_panna || '***';
    const close_pana = todayResult.close_panna || '***';
    const displayOpen = todayResult.open_digit || '*';
    const displayClose = todayResult.close_digit || '*';
    const jodi_result = `${displayOpen}${displayClose}`;
    return {
        ...game,
        open_pana,
        jodi_result,
        close_pana,
    };
}

export const getAllGames = async (req, res) => {
    try {
        const games = await Market.find().lean();

        const todayKey = getISTDateKey(new Date());
        const recentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const recentResults = await Result.find({ date: { $gte: recentCutoff } }).lean();

        const resultByMarket = new Map();
        for (const r of recentResults) {
            if (getISTDateKey(r.date) !== todayKey) continue;
            resultByMarket.set(String(r.market_id), r);
        }

        const currentMBM = getCurrentISTMinutes();
        const gamesWithStatus = games.map((game) => {
            let currentStatus = 'Active';

            if (game.open_time && game.close_time) {
                const openMBM = parseTimeToMinutes(game.open_time);
                const closeMBM = parseTimeToMinutes(game.close_time);

                const crossesMidnight = openMBM > closeMBM;

                if (crossesMidnight) {
                    const isAM = currentMBM >= 0 && currentMBM < 720; // 00:00 to 12:00
                    if (isAM) {
                        if (currentMBM >= closeMBM) currentStatus = 'Closed';
                    } else {
                        if (currentMBM < openMBM) currentStatus = 'Upcoming';
                    }
                } else {
                    if (currentMBM >= closeMBM) {
                        currentStatus = 'Closed';
                    }
                    else if (currentMBM < openMBM) {
                        currentStatus = 'Upcoming';
                    }
                }
            }

            const todayResult = resultByMarket.get(String(game._id));
            const withDisplay = applyTodayResultDisplay(game, todayResult);

            return {
                ...withDisplay,
                is_closed: currentStatus === 'Closed',
                status: currentStatus
            };
        });

        res.status(200).json({ data: gamesWithStatus });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


export const declareResult = async (req, res) => {
    try {
        const { market_id, date, open_panna, close_panna } = req.body;

        // Helper: Panna se Ank nikalne ka logic
        const calculateDigit = (panna) => {
            if (!panna || panna.length !== 3) return '';
            const sum = parseInt(panna[0]) + parseInt(panna[1]) + parseInt(panna[2]);
            return (sum % 10).toString();
        };

        // Digits calculate karo (agar panna empty hoga toh '' aayega)
        const open_digit = open_panna ? calculateDigit(open_panna) : '';
        const close_digit = close_panna ? calculateDigit(close_panna) : '';

        // Date Setup (Aaj ki ya selected date ki limit)
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

        // 1. Market aur existing result dhundo
        const marketDoc = await Market.findById(market_id);
        if (!marketDoc) {
            return res.status(404).json({ message: 'Market not found' });
        }

        let resultDoc = await Result.findOne({ market_id, date: { $gte: startOfDay, $lte: endOfDay } });

        // Flags variables to track what we need to settle
        let runOpenSettlement = false;
        let runCloseSettlement = false;

        // 2. CREATE OR UPDATE RESULT DOCUMENT
        if (!resultDoc) {
            // Naya Din, Naya Result (Create)
            resultDoc = new Result({
                market_id,
                date: targetDate,
                open_panna: open_panna || '',
                open_digit: open_digit,
                close_panna: close_panna || '',
                close_digit: close_digit,
                jodi: (open_digit && close_digit) ? `${open_digit}${close_digit}` : ''
            });

            if (open_panna) runOpenSettlement = true;
            if (close_panna) runCloseSettlement = true;

        } else {
            if (open_panna && !resultDoc.open_panna) {
                resultDoc.open_panna = open_panna;
                resultDoc.open_digit = open_digit;
                runOpenSettlement = true;
            }
            if (close_panna && !resultDoc.close_panna) {
                resultDoc.close_panna = close_panna;
                resultDoc.close_digit = close_digit;
                runCloseSettlement = true;
            }
            
            if (resultDoc.open_digit && resultDoc.close_digit) {
                resultDoc.jodi = `${resultDoc.open_digit}${resultDoc.close_digit}`;
            }
        }

        await resultDoc.save();

        marketDoc.open_pana = resultDoc.open_panna || '***';
        marketDoc.close_pana = resultDoc.close_panna || '***';
        
        const displayOpen = resultDoc.open_digit || '*';
        const displayClose = resultDoc.close_digit || '*';
        marketDoc.jodi_result = `${displayOpen}${displayClose}`;
        
        await marketDoc.save();

        if (runOpenSettlement) runSettlementLogic(market_id, resultDoc, 'Open');
        if (runCloseSettlement) runSettlementLogic(market_id, resultDoc, 'Close');

        try {
            const resultLine = `${marketDoc.open_pana}-${marketDoc.jodi_result}-${marketDoc.close_pana}`;
            await notifyResultDeclared(marketDoc.name || 'Market', resultLine);
        } catch (e) {
            console.error("Notification Error:", e);
        }

        res.status(200).json({ 
            success: true,
            message: 'Result declared and settlement triggered accordingly.', 
            result: resultDoc,
            settlementsTriggered: { open: runOpenSettlement, close: runCloseSettlement }
        });

    } catch (error) {
        console.error("Result Logic Error:", error);
        res.status(500).json({ message: "Server error calculating results." });
    }
};


export const getMarketResults = async (req, res) => {
    try {
        const { market_id, date } = req.query;

        if (!market_id || !date) {
            return res.status(400).json({ message: "market_id and date are required" });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const results = await Result.find({
            market_id: market_id,
            date: { $gte: startOfDay, $lte: endOfDay }
        })
            .sort({ date: 1 })
            .populate('market_id', 'name');

        res.status(200).json({ data: results });

    } catch (error) {
        console.error("Error fetching market results:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getAllResults = async (req, res) => {
    try {
        const results = await Result.find()
            .sort({ date: -1 })
            .populate('market_id', 'name');

        res.status(200).json({ data: results });
    } catch (error) {
        console.error("Error fetching all results:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const resetDailyMarketDisplayAdmin = async (req, res) => {
    try {
        const r = await resetDailyMarketDisplay();
        res.status(200).json({
            success: true,
            message: 'Market display reset to placeholders.',
            modifiedCount: r.modifiedCount ?? r.matchedCount,
        });
    } catch (error) {
        console.error('resetDailyMarketDisplayAdmin:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** External cron (Vercel Cron / GitHub Actions): header x-cron-secret must match CRON_SECRET */
export const cronResetDailyMarketDisplay = async (req, res) => {
    const secret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    try {
        const r = await resetDailyMarketDisplay();
        res.status(200).json({
            success: true,
            message: 'OK',
            modifiedCount: r.modifiedCount ?? r.matchedCount,
        });
    } catch (error) {
        console.error('cronResetDailyMarketDisplay:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};