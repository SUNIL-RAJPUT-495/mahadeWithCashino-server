import TransactionSetting from "../models/TransactionSetting.js";

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
        const { 
            signupBonus, 
            referralBonus, 
            referredBonus, 
            maxReferrals, 
            isPercentage, 
            minDeposit, 
            minWithdrawal 
        } = req.body;

        const updatedSettings = await TransactionSetting.findOneAndUpdate(
            {}, 
            { 
                signupBonus, 
                referralBonus, 
                referredBonus, 
                maxReferrals, 
                isPercentage, 
                minDeposit, 
                minWithdrawal 
            },
            { new: true, upsert: true } 
        );

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