import { Router } from 'express';
import { validateExerciseId } from '../validators/exercises.validator.js';
import { validateWorkoutId } from '../validators/workouts.validator.js';
import { createWorkoutExercise, deleteWorkoutExercise, getWorkoutActiveExercises, getWorkoutExercise, getWorkoutExercises } from '../controllers/workoutExercise.controller.js';

import {
    validateWorkoutExerciseId
} from '../validators/workoutExercise.validator.js';
import checkWorkoutNotClosed from '../middlewares/checkWorkoutNotClosed.middleware.js';
const router = Router();

router.get(
    "/active",
    validateWorkoutId, 
    getWorkoutActiveExercises
);

// Create
router.post(
    "/",
    validateExerciseId, 
    validateWorkoutId,
    createWorkoutExercise
);

// Obtener todos
router.get(
    "/",
    validateWorkoutId,
    getWorkoutExercises
);

// Obtener uno
router.get(
    "/:workoutExerciseId",
    checkWorkoutNotClosed,
    getWorkoutExercise
);

// Eliminar
router.delete(
    "/:workoutExerciseId",
    validateWorkoutExerciseId,
    checkWorkoutNotClosed,
    deleteWorkoutExercise
);

export default router;