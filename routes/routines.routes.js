import { Router } from 'express';
import { createRoutine, deleteRoutine, getAllRoutines, getRoutine, updateRoutine } from '../controllers/routines.controller.js';
const router = Router();

import {
    validateRoutineId,
    validateCreateRoutine,
    validateUpdateRoutine,
    validateGetAllRoutines
} from '../validators/routines.validator.js';

router.post(
    "/",
    validateCreateRoutine,
    createRoutine
);

router.get(
    "/:routineId",
    validateRoutineId,
    getRoutine
);

router.get(
    "/",
    validateGetAllRoutines,
    getAllRoutines
);


router.patch(
    "/:routineId",
    validateRoutineId,
    validateUpdateRoutine,
    updateRoutine
);

router.delete(
    "/:routineId",
    validateRoutineId,
    deleteRoutine
);

export default router;