import { Router } from 'express';
import { getUserStats, updateProfile } from '../controllers/users.controller.js';
import { validateUpdateProfile } from '../validators/user.validators.js';
import { requireUser } from '../middlewares/auth.middlewares.js';

const router = Router();

router.get(
    "/stats",
    requireUser,
    getUserStats
);

router.put("/", 
    requireUser,
    validateUpdateProfile,
    updateProfile
)

export default router;
