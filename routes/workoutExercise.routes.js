import { Router } from 'express';
import { validateExerciseId } from '../validators/exercises.validator.js';
import { validateWorkoutId } from '../validators/workouts.validator.js';
import { createWorkoutExercise, deleteWorkoutExercise, getWorkoutActiveExercises, getWorkoutExercise, getWorkoutExercises } from '../controllers/workoutExercise.controller.js';
import { requireUser } from '../middlewares/auth.middlewares.js';
import {
    validateWorkoutExerciseId
} from '../validators/workoutExercise.validator.js';
import checkWorkoutNotClosed from '../middlewares/checkWorkoutNotClosed.middleware.js';
const router = Router();

router.get(
    "/active",
    requireUser,
    validateWorkoutId, 
    getWorkoutActiveExercises
);

// Create
router.post(
    "/",
    requireUser,
    validateExerciseId, 
    validateWorkoutId,
    createWorkoutExercise
);

// Obtener todos
router.get(
    "/",
    requireUser,
    validateWorkoutId,
    getWorkoutExercises
);

// Obtener uno
router.get(
    "/:workoutExerciseId",
    requireUser,
    checkWorkoutNotClosed,
    getWorkoutExercise
);

// Eliminar
router.delete(
    "/:workoutExerciseId",
    requireUser,
    validateWorkoutExerciseId,
    checkWorkoutNotClosed,
    deleteWorkoutExercise
);

export default router;