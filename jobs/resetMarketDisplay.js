import Market from '../models/Market.js';

/**
 * Home / market cards par jo live result dikhta hai (open_pana, jodi_result, close_pana)
 * har din raat 12 baje IST par default placeholders par reset ho jata hai.
 * Result collection (date-wise history) isse delete nahi hota.
 */
export async function resetDailyMarketDisplay() {
    const result = await Market.updateMany(
        {},
        {
            $set: {
                open_pana: '***',
                jodi_result: '**',
                close_pana: '***',
            },
        }
    );
    return result;
}
