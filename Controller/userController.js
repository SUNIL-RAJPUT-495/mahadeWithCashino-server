import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Bet from '../models/Bid.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateUniqueReferralCode } from '../utils/generateReferral.js';
import { getTransactionSettings, computeReferralAmounts } from '../utils/transactionSettingsHelper.js';
import { notifyUserBonus } from '../utils/notificationHelper.js';

/** Maps User document to API wallet shape (userSchema.wallet) */
function walletFromUser(user) {
    const real = user?.wallet?.realBalance ?? 0;
    const bonus = user?.wallet?.bonusBalance ?? 0;
    return {
        wallet: { realBalance: real, bonusBalance: bonus },
        walletBalance: real + bonus
    };
}

export const createUser = async (req, res) => {
    try {
        const { name, mobile, email, refCode, pass, role } = req.body;

        if (!name || !mobile || !pass) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, mobile and password is required!' 
            });
        }

        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mobile number is alredy registered!' 
            });
        }

        const settings = await getTransactionSettings();
        const signupBonusAmt = Math.max(0, Number(settings.signupBonus) || 0);
        const maxReferrals = Math.max(0, Number(settings.maxReferrals) || 0);

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(pass, saltRounds);

        const myReferralCode = await generateUniqueReferralCode(name);

        const refCodeNorm = refCode && String(refCode).trim() ? String(refCode).trim().toUpperCase() : null;
        let referrer = null;
        let referrerAmount = 0;
        let referredExtraAmount = 0;

        if (refCodeNorm) {
            referrer = await User.findOne({ referralCode: refCodeNorm });
            if (referrer) {
                const alreadyReferredCount = await User.countDocuments({ referredBy: referrer.referralCode });
                const underCap = maxReferrals === 0 || alreadyReferredCount < maxReferrals;
                if (underCap) {
                    const { referrerAmount: rAmt, referredExtraAmount: eAmt } = computeReferralAmounts(settings);
                    referrerAmount = Math.max(0, rAmt);
                    referredExtraAmount = Math.max(0, eAmt);
                }
            }
        }

        const initialBonus = signupBonusAmt + referredExtraAmount;

        const user = await User.create({ 
            name, 
            mobile, 
            ...(email && String(email).trim() ? { email: String(email).trim().toLowerCase() } : {}),
            referredBy: refCodeNorm || null, 
            password: hashedPassword, 
            referralCode: myReferralCode,
            role: role || 'user',
            wallet: { realBalance: 0, bonusBalance: initialBonus },
        });

        if (signupBonusAmt > 0) {
            await Transaction.create({
                userId: user._id,
                type: 'signup_bonus',
                amount: signupBonusAmt,
                method: 'System',
                transactionId: `SIGNUP-${user._id}`,
                status: 'Approved',
                remark: 'Signup bonus',
            });
            await notifyUserBonus(
                user._id,
                'Signup bonus credited',
                `₹${signupBonusAmt} bonus aapke wallet (bonus balance) me add ho gaya hai.`
            );
        }
        if (referredExtraAmount > 0 && referrer) {
            await Transaction.create({
                userId: user._id,
                type: 'referral_bonus',
                amount: referredExtraAmount,
                method: 'System',
                transactionId: `REFERRED-${user._id}`,
                status: 'Approved',
                remark: 'Referred user bonus',
            });
            await notifyUserBonus(
                user._id,
                'Referral bonus credited',
                `₹${referredExtraAmount} referral bonus aapke wallet me add ho gaya hai.`
            );
        }
        if (referrerAmount > 0 && referrer) {
            if (!referrer.wallet) referrer.wallet = { realBalance: 0, bonusBalance: 0 };
            referrer.wallet.bonusBalance = (referrer.wallet.bonusBalance || 0) + referrerAmount;
            await referrer.save();
            await Transaction.create({
                userId: referrer._id,
                type: 'referral_bonus',
                amount: referrerAmount,
                method: 'System',
                transactionId: `REFERRER-${user._id}`,
                status: 'Approved',
                remark: `Referral reward — ${user.name}`,
            });
            await notifyUserBonus(
                referrer._id,
                'Referral reward credited',
                `₹${referrerAmount} bonus — ${user.name} ne aapka referral code use kiya.`
            );
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            user: userResponse 
        });

    } catch (error) {
        console.error("User Creation Error: ", error); 
        
        if (error.message.includes('System mein sirf ek hi Admin') || error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error', 
            error: error.message 
        });
    }
}


export const loginUser = async (req, res) => {
    try {
        const { mobile, pass } = req.body;

        if (!mobile || !pass) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        if (user.status === 'Blocked') {
            return res.status(403).json({ success: false, message: 'Account is blocked' });
        }

        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
        const tokenData = {
            _id: user._id,
            mobile: user.mobile,
            role: user.role
        };

        const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '7d' });

        const cookieOptions = {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'None',
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        };

        const { wallet, walletBalance } = walletFromUser(user);

        res.cookie("token", token, cookieOptions).status(200).json({
            success: true,
            message: 'Login successful',
            token: token, 
            user: {
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                wallet,
                walletBalance,
                role: user.role,
                status: user.status,
                referralCode: user.referralCode,
                referredBy: user.referredBy
            }
        });

    } catch (error) {
        console.error("Login Error: ", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User nahi mila' 
            });
        }

        const { wallet, walletBalance } = walletFromUser(user);

        res.status(200).json({ 
            success: true, 
            user: {
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                wallet,
                walletBalance, 
                role: user.role,
                status: user.status,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
}  


export const getUser = async (req, res) => {
    try {
        // Find single user by ID if needed (though existing method finds all, preserving for legacy)
        const user = await User.find(); 
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const raw = await User.find().select('-password').sort({ createdAt: -1 });
        const users = raw.map((u) => {
            const doc = u.toObject();
            const { walletBalance } = walletFromUser(doc);
            return { ...doc, walletBalance };
        });
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getAdminDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        const depositStats = await Transaction.aggregate([
            { $match: { type: 'Deposit', status: 'Approved' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalDeposits = depositStats[0]?.total || 0;

        const withdrawalStats = await Transaction.aggregate([
            { $match: { type: 'Withdrawal', status: 'Approved' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalWithdrawals = withdrawalStats[0]?.total || 0;

        const pendingWithdrawalsCount = await Transaction.countDocuments({ type: 'Withdrawal', status: 'Pending' });

        const betStats = await Bet.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalBets = betStats[0]?.total || 0;

        const winningStats = await Transaction.aggregate([
             { $match: { type: 'Winning', status: 'Approved' } },
             { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalWinnings = winningStats[0]?.total || 0;
        
        const adminProfitLoss = totalBets - totalWinnings;

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalDeposits,
                totalWithdrawals,
                totalBets,
                totalWinnings,
                adminProfitLoss,
                pendingWithdrawalsCount,
                totalBonuses: 0
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

export const getUserPassbook = async (req, res) => {
    try {
        const userId = req.userId;
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        const bids = await Bet.find({ user_id: userId }).populate('market_id', 'name').sort({ createdAt: -1 });

        let passbook = [];

        const payouts = {
            'Single': 9,
            'Jodi': 90,
            'Single Panna': 140,
            'Double Panna': 280,
            'Triple Panna': 600,
            'Half Sangam': 1000,
            'Full Sangam': 10000
        };

        // Format Transactions
        transactions.forEach(t => {
            const date = new Date(t.createdAt);
            const timeStr = date.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            if (t.type === 'Deposit') {
                passbook.push({
                    id: `txn-${t._id}`,
                    type: "CREDIT",
                    amount: t.amount,
                    date: dateStr,
                    time: timeStr,
                    rawDate: date.getTime(),
                    status: t.status.toUpperCase(),
                    description: `Deposit via ${t.method}`
                });
            } else if (t.type === 'signup_bonus') {
                passbook.push({
                    id: `txn-${t._id}`,
                    type: "CREDIT",
                    amount: t.amount,
                    date: dateStr,
                    time: timeStr,
                    rawDate: date.getTime(),
                    status: (t.status || 'Approved').toUpperCase(),
                    description: t.remark || 'Signup bonus',
                });
            } else if (t.type === 'referral_bonus') {
                passbook.push({
                    id: `txn-${t._id}`,
                    type: "CREDIT",
                    amount: t.amount,
                    date: dateStr,
                    time: timeStr,
                    rawDate: date.getTime(),
                    status: (t.status || 'Approved').toUpperCase(),
                    description: t.remark || 'Referral bonus',
                });
            } else if (t.type === 'Withdrawal') {
                passbook.push({
                    id: `txn-${t._id}`,
                    type: "DEBIT",
                    amount: t.amount,
                    date: dateStr,
                    time: timeStr,
                    rawDate: date.getTime(),
                    status: t.status.toUpperCase(),
                    description: `Withdrawal via ${t.method}`
                });

                if (t.status === 'Rejected') {
                    const rejectDate = new Date(t.updatedAt);
                    passbook.push({
                        id: `ref-${t._id}`,
                        type: "CREDIT",
                        amount: t.amount,
                        date: rejectDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        time: rejectDate.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                        rawDate: rejectDate.getTime(),
                        status: "COMPLETED",
                        description: `Refund: Withdrawal Rejected`
                    });
                }
            }
        });

        // Format Bids
        bids.forEach(b => {
            const date = new Date(b.createdAt);
            const timeStr = date.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            passbook.push({
                id: `bid-${b._id}`,
                type: "DEBIT",
                amount: b.amount,
                date: dateStr,
                time: timeStr,
                rawDate: date.getTime(),
                status: "COMPLETED",
                description: `Played Game - ${b.market_id?.name || 'Unknown'} (${b.game_type})`
            });

            if (b.status === 'Winner') {
                const multiplier = payouts[b.game_type] || 1;
                const winAmount = b.amount * multiplier;
                const winDate = new Date(b.updatedAt);
                passbook.push({
                    id: `win-${b._id}`,
                    type: "CREDIT",
                    amount: winAmount,
                    date: winDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    time: winDate.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    rawDate: winDate.getTime(),
                    status: "COMPLETED",
                    description: `Won Game - ${b.market_id?.name || 'Unknown'} (${b.game_type})`
                });
            }
        });

        // Sort descending
        passbook.sort((a, b) => b.rawDate - a.rawDate);

        res.status(200).json({ success: true, passbook });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobile } = req.body;
        if (!name || !mobile) {
            return res.status(400).json({ message: 'Name and mobile are required' });
        }
        const update = { name, mobile };
        if (email !== undefined && email !== null && String(email).trim() !== '') {
            update.email = String(email).trim().toLowerCase();
        }
        const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { walletBalance } = walletFromUser(user);
        res.status(200).json({ message: 'User updated successfully', user: { ...user.toObject(), walletBalance } });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}



