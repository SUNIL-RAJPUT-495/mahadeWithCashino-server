import TransactionSetting from "../models/TransactionSetting.js";
import { notifyBonusSettingsUpdated } from "../utils/notificationHelper.js";

export const getSettings = async (req, res) => {
    try {
        let settings = await TransactionSetting.findOne();
        
        if (!settings) {
            settings = await TransactionSetting.create({}); 
        }
        
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


export const updateSettings = async (req, res) => {
    try {
        const body = req.body;
        const $set = {};
        const keys = [
            'signupBonus',
            'referralBonus',
            'referredBonus',
            'maxReferrals',
            'isPercentage',
            'minDeposit',
            'minWithdrawal',
        ];
        for (const k of keys) {
            if (body[k] !== undefined) $set[k] = body[k];
        }

        const updatedSettings = await TransactionSetting.findOneAndUpdate(
            {},
            { $set },
            { new: true, upsert: true }
        );

        const bonusKeys = ['signupBonus', 'referralBonus', 'referredBonus', 'maxReferrals', 'isPercentage', 'minDeposit', 'minWithdrawal'];
        const touchedBonus = bonusKeys.some((k) => body[k] !== undefined);
        if (touchedBonus) {
            try {
                await notifyBonusSettingsUpdated();
            } catch (e) {
                console.error("Bonus settings notification:", e);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: "App Settings Updated Successfully!", 
            data: updatedSettings 
        });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};