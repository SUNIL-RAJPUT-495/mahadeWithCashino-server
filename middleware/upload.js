// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists (prevents 500 crash on first run)
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    // 1. Destination: File kis folder mein jayegi?
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Note: Apne backend ke main folder mein 'uploads' naam ka ek khali folder zaroor bana lena
    },
    // 2. Filename: File ka naam kya hoga?
    filename: function (req, file, cb) {
        // Purana naam hatakar hum naya naam denge Date ke sath taaki koi duplicate na ho
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Sirf images allow karne ke liye filter (Security ke liye achha hai)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sirf images allow hain!'), false);
    }
};

export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Maximum 5MB ki image
});