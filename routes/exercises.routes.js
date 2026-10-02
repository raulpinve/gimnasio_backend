import { Router } from 'express';
import {
    createExercise,
    deleteExercise,
    getAllExercises,
    getExercise,
    getExerciseProgress,
    updateExercise
} from '../controllers/exercises.controller.js';
import { requireUser, requireAdmin } from '../middlewares/auth.middlewares.js';
import parseForm from '../middlewares/parseForm.middleware.js';
import {
    validateExerciseId,
    validateCreateExercise,
    validateUpdateExercise
} from '../validators/exercises.validator.js';

const router = Router();

router.get("/", requireUser, getAllExercises);

router.get(
    "/:exerciseId/progress",
    requireUser,
    validateExerciseId,
    getExerciseProgress
);

router.get(
    "/:exerciseId",
    requireUser,
    validateExerciseId,
    getExercise
);

// ---------- Escritura: solo admin ----------
router.post(
    "/",
    requireUser,
    requireAdmin,
    parseForm(),
    validateCreateExercise,
    createExercise
);

router.patch(
    "/:exerciseId",
    requireUser,
    requireAdmin,
    parseForm(),
    validateExerciseId,
    validateUpdateExercise,
    updateExercise
);

router.delete(
    "/:exerciseId",
    requireUser,
    requireAdmin,
    validateExerciseId,
    deleteExercise
);

export default router;