import { Router } from 'express';
import { createWorkout, deleteWorkout, finishWorkout, getAllWorkouts, getWorkout, getWorkoutActive } from '../controllers/workouts.controller.js';
const router = Router();

import {
    validateWorkoutId,
    validateCreateWorkout,
    validateRoutineIdCampoOptional
} from '../validators/workouts.validator.js';

// Create workout
router.post(
    "/",
    validateRoutineIdCampoOptional,
    validateCreateWorkout,
    createWorkout
);

// Get workout by ID
router.get(
    "/active",
    getWorkoutActive
);

// Get workout by ID
router.get(
    "/:workoutId",
    validateWorkoutId,
    getWorkout
);

// Get workouts 
router.get(
    "/",
    getAllWorkouts
);

// Finish workout
router.patch(
    "/:workoutId/finish",
    validateWorkoutId,
    finishWorkout
);

// Delete workout
router.delete(
    "/:workoutId",
    validateWorkoutId,
    deleteWorkout
);

export default router;