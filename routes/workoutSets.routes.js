import { Router } from 'express';
import {
    validateWorkoutExerciseId
} from '../validators/workoutExercise.validator.js';
import validateExerciseType from '../validators/validateExerciseType.validator.js';
import { createWorkoutSet, deleteWorkoutSet, getAllWorkoutSets, getWorkoutSet, updateWorkoutSet } from '../controllers/workoutSets.controller.js';
import checkWorkoutNotClosed from '../middlewares/checkWorkoutNotClosed.middleware.js';
const router = Router();

import {
    validateWorkoutSetId,
    validateCreateWorkoutSet,
    validateUpdateWorkoutSet
} from '../validators/workoutSets.validator.js';

// Create workout set
router.post(
    "/",
    validateWorkoutExerciseId,
    checkWorkoutNotClosed,
    validateExerciseType("strength"),
    validateCreateWorkoutSet,
    createWorkoutSet
);

// Get workout set by ID
router.get(
    "/:workoutSetId",
    validateWorkoutSetId,
    getWorkoutSet
);

// Get all workout sets
router.get(
    "/",
    validateWorkoutExerciseId, 
    getAllWorkoutSets
);

// Update workout set
router.patch(
    "/:workoutSetId",
    validateWorkoutSetId,
    checkWorkoutNotClosed,
    validateUpdateWorkoutSet,
    updateWorkoutSet,
);

// Delete workout set
router.delete(
    "/:workoutSetId",
    validateWorkoutSetId,
    checkWorkoutNotClosed,
    deleteWorkoutSet
);

export default router;