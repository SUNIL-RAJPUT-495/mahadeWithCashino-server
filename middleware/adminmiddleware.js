import { User } from "../models/user.model.js";

export const isAdmin = async (req, res, next) => {
    try {
        const userId = req.userId; 

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized: User ID missing",
                error: true,
                success: false
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                message: "Access denied. Admins only.",
                error: true,
                success: false
            });
        }

        next(); 

    } catch (err) {
        console.error("Admin Middleware Error:", err);
        res.status(500).json({ 
            message: "Server Error in Admin Check",
            error: true,
            success: false
        });
    }
};