import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middlewares.js";
import { syncUser } from "../controllers/auth.controller.js";

const router = Router();

router.post(
    "/sync", 
    verifyFirebaseToken, 
    syncUser
);

export default router;