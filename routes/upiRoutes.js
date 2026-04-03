import express from 'express';
import { verifyAdminToken } from '../middleware/verifyAdminToken.js';
import { addUpi, getAllUpis, setActiveUpi, deleteUpi, getActiveUpi, updateUpi } from '../Controller/upiController.js';
import { upload } from '../middleware/upload.js';

const upiRoutes = express.Router();

upiRoutes.post('/add-upi', verifyAdminToken, upload.single('qrImage'), addUpi);
upiRoutes.put('/update-upi/:id', verifyAdminToken, upload.single('qrImage'), updateUpi);
upiRoutes.get('/all-upi', verifyAdminToken, getAllUpis);
upiRoutes.put('/set-active-upi/:id', verifyAdminToken, setActiveUpi);
upiRoutes.delete('/delete-upi/:id', verifyAdminToken, deleteUpi);

upiRoutes.get('/active-upi', getActiveUpi); 

export default upiRoutes;