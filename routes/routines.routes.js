import { Router } from 'express';
import { createRoutine, deleteRoutine, getAllRoutines, getRoutine, updateRoutine } from '../controllers/routines.controller.js';
import { requireUser } from '../middlewares/auth.middlewares.js';

const router = Router();

import {
    validateRoutineId,
    validateCreateRoutine,
    validateUpdateRoutine,
    validateGetAllRoutines
} from '../validators/routines.validator.js';

router.get(
    "/:routineId",
    requireUser,
    validateRoutineId,
    getRoutine
);

router.get(
    "/",
    requireUser,
    validateGetAllRoutines,
    getAllRoutines
);

router.post(
    "/",
    requireUser,
    validateCreateRoutine,
    createRoutine
);

router.patch(
    "/:routineId",
    requireUser,
    validateRoutineId,
    validateUpdateRoutine,
    updateRoutine
);

router.delete(
    "/:routineId",
    requireUser,
    validateRoutineId,
    deleteRoutine
);

export default router;