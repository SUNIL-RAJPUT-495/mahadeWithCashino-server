import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        console.log(token)
        if (!token) {
            
            return res.status(401).json({ message: "Token missing, please login again" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded)
        const currentUser = await User.findById(decoded._id);

        console.log(currentUser)

        if (!currentUser) {
            return res.status(401).json({ message: "User no longer exists. Please log in again.", action: "LOGOUT" });
        }

        if (currentUser.role !== 'admin') {
            return res.status(403).json({ message: "You are not authorized as an admin." });
        }

        req.user = currentUser;
        next();

    } catch (error) {
        // Token expire hone par bhi 401 (Frontend pe auto-logout chalega)
        return res.status(401).json({ message: "Invalid or expired token", action: "LOGOUT" });
    }
};