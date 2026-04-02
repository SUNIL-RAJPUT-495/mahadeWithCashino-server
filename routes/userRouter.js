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

const userRouter = Router();
userRouter.post("/create-user", createUser);
userRouter.post("/login-user", loginUser);
userRouter.get("/get-user/:id", getUser);
userRouter.get("/get-all-users", getAllUsers);
userRouter.get("/admin-dashboard-stats", getAdminDashboardStats);
userRouter.get("/my-passbook", authToken, getUserPassbook);
userRouter.put("/update-user/:id", updateUser);
userRouter.delete("/delete-user/:id", deleteUser);
userRouter.get("/get-user-profile", authToken, getUserProfile);
userRouter.put("/change-password/:id", authToken, changePassword);

export default userRouter;