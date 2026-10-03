import express from 'express';
import {
    createCardioLog, getAllCardioLogs, updateCardioLog, deleteCardioLog,
    getCardioLog
} from '../controllers/cardioLog.controller.js';
import {
    validateWorkoutExerciseId
} from '../validators/workoutExercise.validator.js';
import validateExerciseType from '../validators/validateExerciseType.validator.js';
import {
    validateCardioLogId,
    validateCreateCardioLog,
    validateUpdateCardioLog
} from '../validators/cardioLogs.validator.js';
import checkWorkoutNotClosed from '../middlewares/checkWorkoutNotClosed.middleware.js';
import { requireUser } from '../middlewares/auth.middlewares.js';

const router = express.Router();

// Crear registro de cardio
router.post(
    "/",
    requireUser,
    validateWorkoutExerciseId,
    checkWorkoutNotClosed,
    validateExerciseType("cardio"),
    validateCreateCardioLog,
    createCardioLog
);

// Obtener registro de cardio por ID
router.get(
    "/:cardioLogId",
    requireUser,
    validateCardioLogId,
    getCardioLog
);

// Obtener todos los logs de cardio
router.get(
    "/",
    requireUser,
    validateWorkoutExerciseId, 
    getAllCardioLogs
);

// Actualizar registro de cardio
router.patch(
    "/:cardioLogId",
    requireUser,
    validateCardioLogId,
    checkWorkoutNotClosed,
    validateUpdateCardioLog,
    updateCardioLog
);

// Eliminar registro de cardio
router.delete(
    "/:cardioLogId",
    requireUser,
    validateCardioLogId,
    checkWorkoutNotClosed,
    deleteCardioLog
);

export default router;
