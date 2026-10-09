
import { Router } from 'express';
import {
    getMyProfile,
    getMyRecommendation,
    upsertMyProfile
} from '../controllers/profiles.controller.js';
import { requireUser } from '../middlewares/auth.middlewares.js';
import { validateProfile } from '../validators/profiles.validator.js';

const router = Router();

router.get(
    "/me",
    requireUser,
    getMyProfile
);

router.put(
    "/me",
    requireUser,
    validateProfile,
    upsertMyProfile
);

router.get(
    "/me/recommendation",
    requireUser,
    getMyRecommendation
);

export default router;