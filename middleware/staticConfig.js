import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ek function banayenge jo 'app' ko receive karega
export const setupStaticFolders = (app) => {
    // Dhyan dein: Kyunki yeh file 'middleware' folder ke andar hai, 
    // toh 'uploads' folder tak jane ke liye '../' lagana padega
    const uploadPath = path.join(__dirname, '../uploads');
    
    app.use('/uploads', express.static(uploadPath));
};