import { Router } from 'express';
import { createRoutineExercise, deleteRoutineExercise, getRoutineExercise, getRoutineExercises, updateRoutineExercise } from '../controllers/routineExercises.controller.js';
import { validateExerciseId } from '../validators/exercises.validator.js';
import { requireUser } from '../middlewares/auth.middlewares.js';

import {
    validateRoutineExerciseId,
    validateCreateRoutineExercise,
    validateUpdateRoutineExercise,
    validateIfExerciseWasCreatedOnRoutine
} from '../validators/routineExercises.validator.js';
import { validateRoutineId } from '../validators/routines.validator.js';

const router = Router();

// Create routine exercise
router.post(
    "/",
    requireUser,
    validateRoutineId,
    validateExerciseId,
    validateIfExerciseWasCreatedOnRoutine,
    validateCreateRoutineExercise,
    createRoutineExercise
);

// Get all exercise from a routine
router.get(
    "/routine/:routineId",
    requireUser,
    validateRoutineId,
    getRoutineExercises
);

// Get routine exercise
router.get(
    "/:routineExerciseId",
    requireUser,
    validateRoutineExerciseId,
    getRoutineExercise
);

// Update a routine exercise 
router.patch(
    "/:routineExerciseId",
    requireUser,
    validateRoutineExerciseId,
    validateUpdateRoutineExercise,
    updateRoutineExercise
);

// Delete a rotine exercise
router.delete(
    "/:routineExerciseId",
    requireUser,
    validateRoutineExerciseId,
    deleteRoutineExercise
);

export default router;