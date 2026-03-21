import { Router } from "express";
import { 
    createUser, 
    loginUser, 
    getUser, 
    updateUser, 
    deleteUser ,getUserProfile
} from "../Controller/userController.js";
import { authToken } from "../middleware/authToken.js";

const userRouter = Router();
userRouter.post("/create-user", createUser);
userRouter.post("/login-user", loginUser);
userRouter.get("/get-user/:id", getUser);
userRouter.put("/update-user/:id", updateUser);
userRouter.delete("/delete-user/:id", deleteUser);
userRouter.get("/get-user-profile", authToken, getUserProfile);

export default userRouter;