export const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    
    let cleanStr = timeStr.trim().toUpperCase().replace(/[^\d:APM\s]/g, '');
    let hours = 0;
    let minutes = 0;

    if (cleanStr.includes('AM') || cleanStr.includes('PM')) {
        const parts = cleanStr.split(/[:\s]+/);
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || '0', 10);
        const period = cleanStr.includes('PM') ? 'PM' : 'AM';

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
    } else {
        const parts = cleanStr.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || '0', 10);
    }

    return (hours * 60) + minutes;
};

export const getCurrentISTMinutes = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
    return h * 60 + m;
};

export const getCurrentISTTimeString = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    return formatter.format(new Date());
};

/** Aaj ki IST calendar date ke liye Mongo query bounds (Result.date se match karne ke liye) */
export const getISTDayBounds = (date = new Date()) => {
    const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
    const start = new Date(`${ymd}T00:00:00+05:30`);
    const end = new Date(`${ymd}T23:59:59.999+05:30`);
    return { start, end };
};

/** Kisi bhi Date ko IST calendar key "YYYY-MM-DD" — purane Result docs ke liye reliable match */
export const getISTDateKey = (d) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(d));
