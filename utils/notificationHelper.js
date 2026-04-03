import Notification from '../models/Notification.js';

export async function notifyResultDeclared(marketName, resultLine) {
    return Notification.create({
        title: `Result declared — ${marketName}`,
        message: resultLine,
        type: 'Result',
        userId: null,
    });
}

export async function notifyUserBonus(userId, title, message) {
    if (!userId) return null;
    return Notification.create({
        title,
        message,
        type: 'Bonus',
        userId,
    });
}

export async function notifyBonusSettingsUpdated() {
    return Notification.create({
        title: 'Bonus & transaction limits updated',
        message:
            'Admin ne signup bonus, referral bonus, deposit / withdrawal limits ya related rules update kiye hain. App par naye rules lagu ho chuke hain.',
        type: 'Alert',
        userId: null,
    });
}
