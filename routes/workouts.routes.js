import { Router } from 'express';
import { createWorkout, deleteWorkout, finishWorkout, getAllWorkouts, getWorkout, getWorkoutActive } from '../controllers/workouts.controller.js';
import { requireUser } from '../middlewares/auth.middlewares.js';
const router = Router();

import {
    validateWorkoutId,
    validateCreateWorkout,
    validateRoutineIdCampoOptional
} from '../validators/workouts.validator.js';

// Create workout
router.post(
    "/",
    requireUser,
    validateRoutineIdCampoOptional,
    validateCreateWorkout,
    createWorkout
);

// Get workout by ID
router.get(
    "/active",
    requireUser,
    getWorkoutActive
);

// Get workout by ID
router.get(
    "/:workoutId",
    requireUser,
    validateWorkoutId,
    getWorkout
);

// Get workouts 
router.get(
    "/",
    requireUser,
    getAllWorkouts
);

// Finish workout
router.patch(
    "/:workoutId/finish",
    requireUser,
    validateWorkoutId,
    finishWorkout
);

// Delete workout
router.delete(
    "/:workoutId",
    requireUser,
    validateWorkoutId,
    deleteWorkout
);

export default router;