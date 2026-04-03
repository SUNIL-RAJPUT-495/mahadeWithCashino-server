import TransactionSetting from '../models/TransactionSetting.js';

export async function getTransactionSettings() {
    let doc = await TransactionSetting.findOne();
    if (!doc) {
        doc = await TransactionSetting.create({});
    }
    return doc;
}

/**
 * referralBonus / referredBonus — fixed ₹ ya signupBonus par % (isPercentage)
 */
export function computeReferralAmounts(settings) {
    const signupBonus = Number(settings.signupBonus) || 0;
    const referralBonus = Number(settings.referralBonus) || 0;
    const referredBonus = Number(settings.referredBonus) || 0;
    const isPercentage = !!settings.isPercentage;

    if (isPercentage) {
        return {
            referrerAmount: Math.round((signupBonus * referralBonus) / 100),
            referredExtraAmount: Math.round((signupBonus * referredBonus) / 100),
        };
    }
    return {
        referrerAmount: referralBonus,
        referredExtraAmount: referredBonus,
    };
}
