import { Router } from 'express';
import {
    createExercise, 
    deleteExercise, 
    getAllExercises, 
    getExercise, 
    getExerciseProgress, 
    updateExercise
} from '../controllers/exercises.controller.js';
import parseForm from '../middlewares/parseForm.middleware.js';

const router = Router();

import {
    validateExerciseId,
    validateCreateExercise,
    validateUpdateExercise
} from '../validators/exercises.validator.js';

// Create
router.post(
    "/",
    parseForm(), 
    validateCreateExercise,
    createExercise
);

// Get all
router.get(
    "/",
    getAllExercises
);

router.get("/:exerciseId/progress", 
    validateExerciseId,
    getExerciseProgress
)

// Get one
router.get(
    "/:exerciseId",
    validateExerciseId,
    getExercise
);

// Update
router.patch(
    "/:exerciseId",
    parseForm(), 
    validateExerciseId,
    validateUpdateExercise,
    updateExercise
);

// Delete
router.delete(
    "/:exerciseId",
    validateExerciseId,
    deleteExercise
);

export default router;