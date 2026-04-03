import User from '../models/User.js';

export const generateUniqueReferralCode = async (userName) => {
    let isUnique = false;
    let newCode = "";

    const namePrefix = userName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'USR');

    while (!isUnique) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        newCode = `${namePrefix}${randomNum}`;

        const existingUser = await User.findOne({ referralCode: newCode });
        if (!existingUser) {
            isUnique = true; 
        }
    }

    return newCode;
};