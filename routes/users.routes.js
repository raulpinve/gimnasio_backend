import { Router } from 'express';
import { getUserStats, updateProfile } from '../controllers/users.controller.js';
import { validateUpdateProfile } from '../validators/user.validators.js';

const router = Router();

router.get(
    "/stats",
    getUserStats
);

router.put("/", 
    validateUpdateProfile,
    updateProfile
)

export default router;
