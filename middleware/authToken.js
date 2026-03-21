import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authToken = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Authentication Failed: Please Login",
                error: true,
                success: false
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);
        const userExist = await User.findById(decode._id);
        if (!userExist) {
            res.clearCookie("token"); 
            return res.status(401).json({ 
                success: false, 
                message: "Account no longer exists. Logging out..." 
            });
        }

        if (!decode) {
            return res.status(401).json({
                message: "Unauthorized access",
                error: true,
                success: false
            });
        }

        req.userId = decode?._id || decode?.id;
        
        next();

    } catch (err) {
        return res.status(401).json({
            message: "Session Expired or Invalid Token",
            error: true,
            success: false
        });
    }
};