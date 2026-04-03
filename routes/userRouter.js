import { Router } from "express";
import { 
    createUser, 
    loginUser, 
    getUser, 
    updateUser, 
    deleteUser, getUserProfile, getAllUsers, getAdminDashboardStats, getUserPassbook,
    changePassword
} from "../Controller/userController.js";
import { authToken } from "../middleware/authToken.js";
import { verifyAdminToken } from "../middleware/verifyAdminToken.js";

const userRouter = Router();
userRouter.post("/create-user", createUser);
userRouter.post("/login-user", loginUser);
userRouter.get("/get-user/:id", verifyAdminToken, getUser);
userRouter.get("/get-all-users", verifyAdminToken, getAllUsers);
userRouter.get("/admin-dashboard-stats", verifyAdminToken, getAdminDashboardStats);
userRouter.get("/my-passbook", authToken, getUserPassbook);
userRouter.put("/update-user/:id", verifyAdminToken, updateUser);
userRouter.delete("/delete-user/:id", verifyAdminToken, deleteUser);
userRouter.get("/get-user-profile", authToken, getUserProfile);
userRouter.put("/change-password/:id", authToken, changePassword);

export default userRouter;